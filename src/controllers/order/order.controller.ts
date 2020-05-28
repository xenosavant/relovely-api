import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  getWhereSchemaFor,
  patch,
  put,
  del,
  requestBody,
  HttpErrors,
} from '@loopback/rest';
import { Order, User, Product, ProductRelations, ProductWithRelations, UserWithRelations } from '../../models';
import { OrderRepository, UserRepository, ProductRepository } from '../../repositories';
import { inject, service } from '@loopback/core';
import { SecurityBindings } from '@loopback/security';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { authenticate } from '@loopback/authentication';
import * as moment from 'moment'
import { userListFields } from '../user/response/user-list.interface';
import { ListResponse } from '../list-response';
import { StripeService } from '../../services/stripe/stripe.service';
import { OrderRequest } from './order.request';
import { EasyPostService } from '../../services/easypost/easypost.service';
import { Address } from '../../models/address.model';

@authenticate('jwt')
export class OrderController {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile,
    @service(StripeService)
    public stripeService: StripeService,
    @service(EasyPostService)
    public easyPostService: EasyPostService
  ) { }

  @post('/products/{id}/orders', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Order) } },
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof Product.prototype.id,
    @requestBody() request: OrderRequest
  ): Promise<Order> {
    const product: ProductWithRelations = await this.productRepository.findById(id);
    const buyer: UserWithRelations = await this.userRepository.findById(this.user.id, { fields: { stripeCustomerId: true, addresses: true, cards: true } });
    if (!buyer || !buyer.stripeCustomerId) {
      throw new HttpErrors.BadRequest('No customer');
    }
    if (!product.sold) {
      const seller = await this.userRepository.findById(product.sellerId, { fields: { stripeSellerId: true } });
      const shipment = await this.easyPostService.purchaseShipment(request.shipmentId, request.rateId);
      const token = await this.stripeService.chargeCustomer(buyer.stripeCustomerId as string, seller.stripeSellerId as string, product.price, request.paymentId);
      if (token) {
        product.sold = true;
        await this.productRepository.update(product);
        const card = buyer.cards.find(c => c.stripeId === request.paymentId);
        return this.productRepository.order(id).create({
          sellerId: product.sellerId,
          buyerId: this.user.id as string,
          purchaseDate: moment.utc().toDate(),
          status: 'ordered',
          stripeChargeId: token,
          shipmentId: shipment.shipmentId,
          trackerId: shipment.trackerId,
          shippingCarrier: 'USPS',
          shippingCost: shipment.shippingCost,
          tax: 0,
          total: product.price + shipment.shippingCost,
          trackingUrl: shipment.trackingUrl,
          shippingLabelUrl: shipment.postageLabelUrl,
          address: buyer.addresses.find(a => a.primary) as Address,
          paymentLast4: card?.last4,
          paymentType: card?.type
        });
      } else {
        throw new HttpErrors.BadRequest('Charge was declined');
      }
    } else {
      throw new HttpErrors.Conflict('This product is no longer available');
    }
  }

  @get('/orders', {
    responses: {
      '200': {
        description: 'Array of Order model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Order, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async find(
    @param.query.boolean('sales') sales?: boolean
  ): Promise<ListResponse<Order>> {
    const currentUser = await this.userRepository.findById(this.user.id);
    const include = [{ relation: 'product' },
    { relation: 'buyer', scope: { fields: userListFields } },
    { relation: 'seller', scope: { fields: userListFields } }];
    let where = {};
    let relation: string;
    include.push();
    let list = [];
    if (currentUser.type === 'seller') {
      if (sales) {
        where = { sellerId: currentUser.id };
      } else {
        where = { buyerId: currentUser.id };
      }
    } else {
      where = { buyerId: currentUser.id };
    }
    list = await this.orderRepository.find({ where: where, include: include });
    return {
      count: list.length,
      items: list
    }
  }

  @get('/orders/{id}', {
    responses: {
      '200': {
        description: 'Order model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Order, { includeRelations: true }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<Order> {
    return this.orderRepository.findById(id, {
      include: [{ relation: 'buyer', scope: { fields: userListFields } },
      { relation: 'seller', scope: { fields: userListFields } },
      { relation: 'product' }]
    });
  }
}
