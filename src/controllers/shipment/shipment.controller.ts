import { authenticate } from '@loopback/authentication';
import { repository } from '@loopback/repository';
import { OrderRepository, UserRepository, ProductRepository } from '../../repositories';
import { inject, service } from '@loopback/core';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { StripeService } from '../../services/stripe/stripe.service';
import { SecurityBindings } from '@loopback/security';
import { post, getModelSchemaRef, param, requestBody, HttpErrors } from '@loopback/rest';
import { Order, Product } from '../../models';
import { OrderRequest } from '../order/order.request';
import { AddressVerification } from '../../services/easypost/address-verification';
import { EasyPostService } from '../../services/easypost/easypost.service';
import { Address } from '../../models/address.model';
import { PreviewShipmentRequest } from './preview-shipment.request';
import { PreviewShipmentResponse } from './preview-shipment.response';
import moment from 'moment';


export class ShipmentController {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile,
    @service(EasyPostService)
    public easypostService: EasyPostService
  ) { }

  @authenticate('jwt')
  @post('/shipments/verify-address', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(AddressVerification) } },
      },
    },
  })
  async verify(
    @requestBody() address: Omit<Address, 'name'>
  ): Promise<AddressVerification> {
    return await this.easypostService.verifyAddress(address);
  }

  @authenticate('jwt')
  @post('/shipments/preview', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(PreviewShipmentResponse) } },
      },
    },
  })
  async preview(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PreviewShipmentRequest),
        },
      },
    })
    request: PreviewShipmentRequest
  ): Promise<PreviewShipmentResponse> {
    const seller = await this.userRepository.findById(request.sellerId, { fields: { seller: true } });
    request.fromAddress = seller.seller?.address
    return await this.easypostService.createShipment(request);
  }

  @post('/shipments/easypost-webhook', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(PreviewShipmentResponse) } },
      },
    },
  })
  async webhook(
    @param.query.string('secret') secret: string,
    @requestBody()
    event: any) {
    if (!secret || secret !== process.env.EASYPOST_WEBHOOK_SECRET) {
      throw new HttpErrors.Unauthorized();
    }
    if (event.description === 'tracker.updated') {
      const id = event.result.id;
      const order = await this.orderRepository.findOne({ where: { trackerId: id } });
      if (!order) {
        throw new HttpErrors.NotFound();
      }
      if (event.result.status === 'in_transit') {
        if (order.status === 'purchased') {
          await this.orderRepository.updateById(order.id, { status: 'shipped', shipDate: moment().toDate() });
        }
      } else if (event.result.status === 'delivered') {
        await this.orderRepository.updateById(order.id, { status: 'delivered', deliveryDate: moment().toDate() });
      } else if (['error', 'failure'].includes(event.result.status)) {
        await this.orderRepository.updateById(order.id, { status: 'error' });
      }
    }
  }
}
