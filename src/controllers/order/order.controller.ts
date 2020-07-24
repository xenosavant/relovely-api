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
  Trie,
} from '@loopback/rest';
import { Order, User, Product, ProductRelations, ProductWithRelations, UserWithRelations } from '../../models';
import { OrderRepository, UserRepository, ProductRepository } from '../../repositories';
import { inject, service } from '@loopback/core';
import { SecurityBindings } from '@loopback/security';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { authenticate } from '@loopback/authentication';
import moment from 'moment-timezone';
import { userListFields } from '../user/response/user-list.interface';
import { ListResponse } from '../list-response';
import { StripeService } from '../../services/stripe/stripe.service';
import { OrderRequest } from './order.request';
import { EasyPostService } from '../../services/easypost/easypost.service';
import { Address } from '../../models/address.model';
import { PreviewShipmentResponse } from '../shipment/preview-shipment.response';
import { PreviewShipmentRequest } from '../shipment/preview-shipment.request';
import { TaxService, TAX_CODE } from '../../services/tax/tax.service';
import { SellerDetails } from '../../models/seller-details';
import { SendgridService } from '../../services';
import { formatMoney, getShippingCost } from '../../util/format';
import { TaxTransactionRequest } from '../../services/tax/tax-transaction.request';
import { Card } from '../../models/card.model';

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
    public taxService: TaxService,
    @service(SendgridService)
    public sendGridService: SendgridService,
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
  async checkout(
    @param.path.string('id') id: typeof Product.prototype.id,
    @requestBody() request: OrderRequest
  ): Promise<Order> {
    const product: ProductWithRelations = await this.productRepository.findById(id);
    const buyer: UserWithRelations = await this.userRepository.findById(this.user.id, { fields: { stripeCustomerId: true, addresses: true, cards: true, email: true } });
    if (!buyer || !buyer.stripeCustomerId) {
      throw new HttpErrors.BadRequest('Something went wrong there...please try your purchase again');
    }
    if (!product.sold) {
      const card = buyer.cards.find(c => c.stripeId === request.paymentId) as Card;
      try {
        const order = await this.createOrder(request.address, product, request.paymentId, request.shipmentId,
          buyer.email, card.last4 as string, card.type, buyer.stripeCustomerId);
        return order;
      } catch (error) {
        throw error;
      }
    } else {
      throw new HttpErrors.Conflict('This product is no longer available');
    }
  }


  @post('/products/{id}/orders/guest', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Order) } },
      },
    },
  })
  async checkoutGuest(
    @param.path.string('id') id: typeof Product.prototype.id,
    @requestBody() request: OrderRequest
  ): Promise<Order> {
    const product: ProductWithRelations = await this.productRepository.findById(id);
    if (product.sold) {
      throw new HttpErrors.Conflict('This product is no longer available');
    }
    try {
      const order = await this.createOrder(request.address, product, request.paymentId, request.shipmentId,
        request.last4 as string, request.cardType as string, request.email as string);
      return order;
    } catch (error) {
      throw error;
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
    list = await this.orderRepository.find({ where: where, include: include, order: ['purchaseDate DESC'] });
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
      throw new HttpErrors.BadRequest('Something went wrong there...please refresh the page');
    }
    shipment.shippingRate = getShippingCost(request.weight);
    const taxRate = await this.taxService.calculateTax({
      toAddress: request.toAddress,
      fromAddress: request.fromAddress as Address,
      shippingCost: shipment.shippingRate,
      price: request.price,
      sellerId: seller.id as string,
      categoryId: request.categoryId
    })
    if (taxRate.error) {
      throw new HttpErrors.BadRequest('Something went wrong there...please refresh the page');
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
      if (event.result.status === 'in_transit' || event.result.status === 'out_for_delivery') {
        if (order.status === 'purchased') {
          let shipDate: Date;
          const detail = event.result.tracking_details.find((d: any) =>
            d.status === 'in_transit' || d.status === 'out_for_delivery'
          );
          if (detail) {
            // date is acually in EDT not UTC?
            detail.datetime = detail.datetime.replace(/Z/g, '');
            shipDate = moment.tz(detail.datetime, "America/New_York").utc().toDate();
          } else {
            shipDate = moment().toDate()
          }
          await this.orderRepository.updateById(order.id, { status: 'shipped', shipDate: shipDate });
        }
      } else if (event.result.status === 'delivered') {
        let shipDate: Date;
        const detail = event.result.tracking_details.find((d: any) =>
          d.status === 'delivered'
        );
        if (detail) {
          // date is acually in EDT not UTC?
          detail.datetime = detail.datetime.replace(/Z/g, '');
          shipDate = moment.tz(detail.datetime, "America/New_York").utc().toDate();
        } else {
          shipDate = moment().toDate()
        }
        await this.orderRepository.updateById(order.id, { status: 'delivered', deliveryDate: shipDate });
      } else if (['error', 'failure'].includes(event.result.status)) {
        await this.orderRepository.updateById(order.id, { status: 'error' });
      }
    }
  }

  async generateOrderNumber(): Promise<string> {
    const randomString = this.randomString(2, this.charString);
    const randomNumbers = Math.round(Math.random() * 99);
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

  async createOrder(shipTo: Address, product: Product, paymentId: string,
    shipmentId: string, buyerEmail: string,
    cardLast4: string, cardType: string, customerId?: string): Promise<Order> {
    const seller = await this.userRepository.findById(product.sellerId);
    const shipment = await this.easyPostService.purchaseShipment(shipmentId);
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

    const shippingCost = getShippingCost(product.weight);

    const tax = await this.taxService.calculateTax({
      toAddress: shipTo,
      fromAddress: seller.returnAddress as Address,
      shippingCost: shippingCost,
      price: product.price,
      sellerId: seller.id as string,
      categoryId: product.categories.find(cat => cat.length === 2) as string
    });

    if (tax.error) {
      throw new HttpErrors[500]('Something went wrong there...please try your purchase again');
    }

    const total = product.price + tax.tax + shippingCost;
    const fees = sellerFee + transferFee + tax.tax + shippingCost;
    const token = await this.stripeService.chargeCustomer(seller.stripeSellerId as string, total, fees, paymentId, customerId as string);
    if (token) {
      product.sold = true;
      await this.productRepository.update(product);

      const order = await this.productRepository.order(product.id).create({
        sellerId: product.sellerId,
        buyerId: this.user ? this.user.id as string : undefined,
        purchaseDate: moment.utc().toDate(),
        status: 'purchased',
        stripeChargeId: token,
        shipmentId: shipment.shipmentId,
        trackerId: shipment.trackerId,
        shippingCarrier: 'USPS',
        shippingCost: shippingCost,
        tax: tax.tax,
        total: product.price + shippingCost + tax.tax,
        trackingUrl: shipment.trackingUrl,
        shippingLabelUrl: shipment.postageLabelUrl,
        address: shipTo,
        paymentLast4: cardLast4,
        paymentType: cardType,
        orderNumber: await this.generateOrderNumber(),
        sellerFee: sellerFee,
        transferFee: transferFee
      });

      if (freeSalesChanged) {
        await this.userRepository.updateById(product.sellerId, { 'seller.freeSales': (seller.seller?.freeSales as number) - 1 } as any)
      }

      // TODO: Move this
      const taxRequest: TaxTransactionRequest = {
        transaction_id: order.id as string,
        transaction_date: moment().utc().toDate(),
        to_country: shipTo.country,
        to_zip: shipTo.zip,
        to_state: shipTo.state,
        to_city: shipTo.city,
        to_street: shipTo.line1,
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
      }
      if (['11', '12', '21', '22'].includes(product.categories.find(cat => cat.length === 2) as string)) {
        taxRequest.line_items[0].product_tax_code = TAX_CODE;
      }
      const taxTransaction = await this.taxService.createTransaction(taxRequest);

      this.sendGridService.sendTransactional({
        price: formatMoney(product.price),
        tax: formatMoney(order.tax),
        shipping: formatMoney(order.shippingCost),
        total: formatMoney(order.total),
        to: shipTo,
        orderNumber: order.orderNumber,
        trackingLink: order.trackingUrl,
        title: product.title
      },
        'd-d5bc3507b9c042a4880abae643ee2a26', buyerEmail);
      this.sendGridService.sendTransactional({
        price: formatMoney(product.price),
        sellerFee: formatMoney(order.sellerFee),
        transferFee: formatMoney(order.transferFee),
        total: formatMoney(product.price - order.sellerFee - order.transferFee),
        to: shipTo,
        orderNumber: order.orderNumber,
        shippingLabelUrl: order.shippingLabelUrl,
        title: product.title
      },
        'd-927c52400712440ea78d8d487e0c25ed', seller.email);

      return order;
    } else {
      throw new HttpErrors.BadRequest('Charge was declined');
    }
  }
}


