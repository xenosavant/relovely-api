import { Entity, model, property } from '@loopback/repository';

@model({ settings: { strict: true } })
export class Product extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  sellerId: string;

  @property({
    type: 'string',
    required: true,
  })
  title: string;

  @property.array(String, {
    type: 'string',
    required: true,
  })
  imageUrls?: string[];

  @property.array(String, {
    type: 'string',
    required: true,
  })
  videoUrls?: string[];

  @property({
    type: 'string',
    required: true,
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
    type: 'string',
    required: true,
  })
  categoryIds?: string[];

  @property({
    type: 'string',
    required: false,
  })
  sizeId?: string;

  @property({
    type: 'string',
    required: true,
  })
  size: string;

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

  @property.array(String, {
    type: 'string',
    required: true,
  })
  tags: string[];
}
