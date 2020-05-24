import { Entity, model, property, belongsTo } from '@loopback/repository';
import { User, Product, ProductWithRelations } from '.';
import { UserList } from '../controllers/user/response/user-list.interface';
import { UserWithRelations } from './user.model';
import { Address } from 'cluster';

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
    required: true,
  })
  public address: Address;

  @property({
    required: true,
  })
  public stripeChargeId: string;

  @property({
    type: 'string',
    required: true,
  })
  public status: 'ordered' | 'shipped' | 'unshipped' | 'cancelled' | 'delivered';

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
  public trackingNumber?: string;

  @property({
    type: 'string',
    required: false,
  })
  public shippingCarrerName?: string;

  @property({
    type: 'string',
    required: false,
  })
  public shippingCarrierId?: string;

  @property({
    type: 'string',
    required: false,
  })
  public total?: number;

  @property({
    type: 'string',
    required: false,
  })
  public shippingCost?: number;

  @property({
    type: 'string',
    required: false,
  })
  public tax?: number;
}

export interface OrderRelations {
  product?: ProductWithRelations;
  buyer?: UserWithRelations;
  seller?: UserWithRelations;
}

export type OrderWithRelations = Order & OrderRelations;
