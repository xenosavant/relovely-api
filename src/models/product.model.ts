import { Entity, model, property, belongsTo, hasOne } from '@loopback/repository';
import { VideoMetaData } from './video-meta-data.model';
import { ImageSet } from './image-set';
import { User, UserWithRelations } from './user.model';
import { UserList } from '../controllers/user/response/user-list.interface';
import { Order } from './order.model';

@model({ settings: { strict: true } })
export class Product extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: false,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property.array(ImageSet)
  images?: ImageSet[];

  @property.array(VideoMetaData)
  videos?: VideoMetaData[];

  @property({
    type: 'string',
    required: false,
  })
  description?: string;

  @property({
    type: 'date',
    required: false,
  })
  auctionStart?: Date;

  @property({
    type: 'date',
    required: false,
  })
  auctionEnd?: Date;

  @property({
    type: 'number',
    required: false,
  })
  currentBid?: number;

  @property.array(String, {
    required: true,
  })
  categories: string[];

  @property({
    type: 'string',
    required: false,
  })
  sizeId?: string;

  @property({
    type: 'string',
    required: false,
  })
  size?: string;

  @property({
    type: 'string',
    required: true,
  })
  brand: string;

  @property({
    type: 'number',
    required: true,
  })
  price: number;

  @property({
    type: 'boolean',
    required: true,
  })
  sold: boolean;

  @property({
    type: 'boolean',
    required: true,
  })
  auction: boolean;

  @property.array(String)
  tags?: string[];

  @belongsTo(() => User)
  sellerId: string;

  @hasOne(() => Order)
  order: Order;
}

export interface ProductRelations {
  seller: UserWithRelations;
}

export type ProductWithRelations = Product & ProductRelations;
