import { model, Entity, property, belongsTo, hasOne } from '@loopback/repository';
import { User, Product, ProductWithRelations, UserWithRelations, Order, OrderWithRelations } from '.';


@model({ settings: { strict: true } })
export class Review extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property({
    type: 'string',
    required: true,
  })
  body: string;

  @property({
    type: 'number',
    required: true,
  })
  rating: number;

  @property({
    type: 'date',
    required: true,
  })
  date: Date;

  @belongsTo(() => User, { name: 'seller' })
  sellerId: string;

  @belongsTo(() => User, { name: 'reviewer' })
  reviewerId: string;

  @belongsTo(() => Product, { name: 'product' })
  productId: string;

  @belongsTo(() => Order, { name: 'order' })
  orderId: string;

}

export interface ReviewRelations {
  product?: ProductWithRelations;
  order?: OrderWithRelations;
  reviewer?: UserWithRelations;
  seller?: UserWithRelations;
}

export type ReviewWithRelations = Review & ReviewRelations;

