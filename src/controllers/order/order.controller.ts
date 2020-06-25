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
import moment from 'moment';
import { userListFields } from '../user/response/user-list.interface';
import { ListResponse } from '../list-response';
import { StripeService } from '../../services/stripe/stripe.service';
import { OrderRequest } from './order.request';
import { EasyPostService } from '../../services/easypost/easypost.service';
import { Address } from '../../models/address.model';
import { PreviewShipmentResponse } from '../shipment/preview-shipment.response';
import { PreviewShipmentRequest } from '../shipment/preview-shipment.request';
import { TaxService } from '../../services/tax/tax.service';
import { SellerDetails } from '../../models/seller-details';

export class OrderController {
  charString = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
    public easyPostService: EasyPostService,
    @service(TaxService)
    public taxService: TaxService
  ) { }

  @authenticate('jwt')
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
      const shipTo = buyer.addresses.find(a => a.primary) as Address;
      const seller = await this.userRepository.findById(product.sellerId);
      const shipment = await this.easyPostService.purchaseShipment(request.shipmentId, request.rateId);
      let sellerFee = 0,
        transferFee = 0,
        freeSalesChanged = false;
      if (seller.seller?.freeSales && seller.seller.freeSales > 0) {
        freeSalesChanged = true;
      } else {
        if (product.price < 500) {
          sellerFee = 50;
        } else {
          sellerFee = Math.round(product.price * .1);
        }
        transferFee = Math.round((product.price * .029));
      }

      const tax = await this.taxService.calculateTax({
        toAddress: shipTo,
        fromAddress: seller.returnAddress as Address,
        shippingCost: shipment.shippingCost,
        price: product.price,
        sellerId: seller.id as string,
        categoryId: product.categories.find(cat => cat.length === 2) as string
      });

      if (tax.error) {
        throw new HttpErrors[500]('Something went wrong there...try your purchase again');
      }

      const total = product.price + tax.tax + shipment.shippingCost;
      const fees = sellerFee + transferFee + tax.tax + shipment.shippingCost;
      const token = await this.stripeService.chargeCustomer(buyer.stripeCustomerId as string, seller.stripeSellerId as string, total, fees, request.paymentId);
      if (token) {
        product.sold = true;
        await this.productRepository.update(product);
        const card = buyer.cards.find(c => c.stripeId === request.paymentId);

        const order = await this.productRepository.order(id).create({
          sellerId: product.sellerId,
          buyerId: this.user.id as string,
          purchaseDate: moment.utc().toDate(),
          status: 'purchased',
          stripeChargeId: token,
          shipmentId: shipment.shipmentId,
          trackerId: shipment.trackerId,
          shippingCarrier: 'USPS',
          shippingCost: shipment.shippingCost,
          tax: tax.tax,
          total: product.price + shipment.shippingCost,
          trackingUrl: shipment.trackingUrl,
          shippingLabelUrl: shipment.postageLabelUrl,
          address: buyer.addresses.find(a => a.primary) as Address,
          paymentLast4: card?.last4,
          paymentType: card?.type,
          orderNumber: await this.generateOrderNumber(),
          sellerFee: sellerFee,
          transferFee: transferFee
        });

        if (freeSalesChanged) {
          await this.userRepository.updateById(product.sellerId, { 'seller.freeSales': (seller.seller?.freeSales as number) - 1 } as any)
        }

        // TODO: Move this
        const taxTransaction = await this.taxService.createTransaction({
          transaction_id: order.id as string,
          transaction_date: moment().toDate(),
          to_country: request.address.country,
          to_zip: request.address.zip,
          to_state: request.address.state,
          to_city: request.address.city,
          to_street: request.address.line1,
          amount: (product.price / 100) + (order.shippingCost as number / 100),

          shipping: (order.shippingCost as number / 100),
          sales_tax: (order.tax as number / 100),
          line_items: [
            {
              quantity: 1,
              product_identifier: product.id as string,
              description: product.title,
              unit_price: (product.price / 100),
              sales_tax: (order.tax as number / 100)
            }
          ]
        });
        return order;
      } else {
        throw new HttpErrors.BadRequest('Charge was declined');
      }
    } else {
      throw new HttpErrors.Conflict('This product is no longer available');
    }
  }

  @authenticate('jwt')
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
    const include = [{ relation: 'product', scope: { fields: { images: true, title: true, id: true } } },
    { relation: 'buyer', scope: { fields: userListFields } },
    { relation: 'seller', scope: { fields: userListFields } }];
    let where = {};
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

  @authenticate('jwt')
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
    const order = await this.orderRepository.findById(id, {
      include: [{ relation: 'buyer', scope: { fields: userListFields } },
      { relation: 'seller', scope: { fields: userListFields } },
      { relation: 'product' },
      { relation: 'review' }]
    });
    return order;
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
    const seller = await this.userRepository.findById(request.sellerId);
    request.fromAddress = seller.returnAddress
    const shipment = await this.easyPostService.createShipment(request);
    if (shipment.error) {
      throw new HttpErrors.BadRequest(shipment.error);
    }
    const taxRate = await this.taxService.calculateTax({
      toAddress: request.toAddress,
      fromAddress: request.fromAddress as Address,
      shippingCost: shipment.shippingRate,
      price: request.price,
      sellerId: seller.id as string,
      categoryId: request.categoryId
    })
    if (taxRate.error) {
      throw new HttpErrors.BadRequest(taxRate.error);
    }
    return { ...shipment, taxRate: taxRate.tax }
  }

  @authenticate('jwt')
  @post('/orders/{id}/ship', {
    responses: {
      '204': {
        description: 'Successul update'
      },
    },
  })
  async ship(@param.path.string('id') id: string): Promise<void> {
    const order = await this.orderRepository.findById(id);
    if (order.sellerId.toString() !== this.user.id) {
      throw new HttpErrors.Forbidden();
    }
    this.orderRepository.updateById(id, { labelPrinted: true })
  }

  @post('/shipments/easypost-webhook', {
    responses: {
      '204': {
        description: 'User model instance',
      },
    },
  })
  async webhook(
    @param.query.string('secret') secret: string,
    @requestBody()
    event: any) {
    if (!secret || secret !== process.env.EASYPOST_WEBHOOK_SECRET?.toString()) {
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

  async generateOrderNumber(): Promise<string> {
    const randomString = this.randomString(2, this.charString);
    const randomNumbers = Math.round(Math.random() * 10);
    const date = moment().format('YYMMDD');
    const orderNumber = date + '-' + randomNumbers + randomString;
    const existing = await this.orderRepository.count({ orderNumber: orderNumber });
    if (existing.count > 0) {
      return this.generateOrderNumber();
    } else {
      return orderNumber;
    }
  }

  randomString(length: number, chars: string) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  }
}


