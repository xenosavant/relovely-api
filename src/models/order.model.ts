import { Entity, model, property, belongsTo, hasOne } from '@loopback/repository';
import { User, Product, ProductWithRelations } from '.';
import { UserList } from '../controllers/user/response/user-list.interface';
import { UserWithRelations } from './user.model';
import { Address } from './address.model';
import { Card } from './card.model';
import { Review, ReviewWithRelations } from './review.model';

@model({ settings: { strict: true } })
export class Order extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @belongsTo(() => Product)
  productId: string;

  @belongsTo(() => User, { name: 'seller' })
  sellerId: string;

  @belongsTo(() => User, { name: 'buyer' })
  buyerId: string;

  @property({
    type: 'date',
    required: true,
  })
  purchaseDate: Date;

  @property({
    type: 'string',
    required: false,
  })
  public shipDate?: Date;

  @property({
    type: 'string',
    required: false,
  })
  public deliveryDate?: Date;

  @property({
    type: 'string',
    required: false,
  })
  public disputeDate?: Date;

  @property({
    type: 'string',
    required: false,
  })
  public resolutionDate?: Date;

  @property({
    required: true,
  })
  public address: Address;

  @property({
    required: true,
  })
  public stripeChargeId: string;

  @property({
    required: false,
  })
  public stripePayoutId?: string;

  @property({
    type: 'string',
    required: true,
  })
  public status: 'purchased' | 'shipped' | 'delivered' | 'refunded' | 'cancelled' | 'error' | 'disputed'

  @property({
    type: 'string',
    required: false,
  })
  public orderNumber?: string;

  @property({
    type: 'string',
    required: false,
  })
  public shippingCarrier?: string;

  @property({
    type: 'string',
    required: false,
  })
  public shipmentId: string;

  @property({
    type: 'string',
    required: false,
  })
  public trackerId: string;

  @property({
    type: 'string',
    required: false,
  })
  public shippingLabelUrl: string;

  @property({
    type: 'string',
    required: false,
  })
  public trackingUrl: string;

  @property({
    type: 'string',
    required: false,
  })
  public email?: string;

  @property({
    type: 'number',
    required: true,
  })
  public total: number;

  @property({
    type: 'number',
    required: true,
  })
  public shippingCost: number;

  @property({
    type: 'number',
    required: true,
  })
  public tax: number;

  @property({
    type: 'number',
    required: true,
  })
  public sellerFee: number;

  @property({
    type: 'number',
    required: true,
  })
  public transferFee: number;

  @property({
    type: 'number',
    required: true,
  })
  public discount: number;

  @property({
    type: 'number',
    required: true,
  })
  public shippingDiscount: number;

  @property({
    type: 'string',
    required: true
  })
  public paymentLast4: string;

  @property({
    type: 'string',
    required: true
  })
  public paymentType: string;

  @property({
    type: 'boolean',
    required: false
  })
  public labelPrinted: boolean;

  @property({
    type: 'string',
    required: false
  })
  public promoCode?: string;

  @property.array(String, {
    required: false,
  })
  sizes?: string[];

  @property({
    type: 'string',
    required: false
  })
  public pinterest?: string;

  @property({
    type: 'string',
    required: false
  })
  public instagram?: string;

  @property({
    type: 'string',
    required: false
  })
  public buyerInfo?: string;

  @hasOne(() => Review, { keyTo: 'orderId' })
  review: Review;
}

export interface OrderRelations {
  product?: ProductWithRelations;
  buyer?: UserWithRelations;
  seller?: UserWithRelations;
  review?: ReviewWithRelations;
}

export type OrderWithRelations = Order & OrderRelations;
