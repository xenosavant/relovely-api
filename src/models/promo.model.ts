import { model, Entity, property, hasOne, belongsTo } from '@loopback/repository';
import { User, UserWithRelations } from './user.model';

@model({ settings: { strict: true } })
export class Promo extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: true
  })
  id?: string;

  @belongsTo(() => User, { name: 'seller' })
  sellerId?: string;

  @property({
    type: 'string',
    required: true,
  })
  public code: string;

  @property({
    type: 'string',
    required: true,
  })
  type: 'discount' | 'freeShipping';

  @property({
    type: 'number',
    required: false,
  })
  public discountPercent?: number;
}

export interface PromoRelations {
  seller?: UserWithRelations;
}

export type PromoWithRelations = Promo & PromoRelations;
