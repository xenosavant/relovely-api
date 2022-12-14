import { Entity, model, property, hasMany } from '@loopback/repository';
import { Product, ProductWithRelations } from './product.model';
import { Order } from './order.model';
import { UserPreferences, UI } from './user-preferences.model';
import { Address } from './address.model';
import { Card } from './card.model';
import { SellerDetails } from './seller-details';
import { Review } from './review.model';
import { Promo } from './promo.model';

@model({ settings: { strict: true, hiddenProperties: ['passwordHash'] } })
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'boolean',
    required: true,
  })
  active: boolean;

  @property({
    type: 'date',
    required: false,
  })
  lastActive?: Date;

  @property({
    type: 'boolean',
    required: false,
  })
  admin: boolean;

  @property({
    type: 'string',
    required: true,
  })
  email: string;

  @property({
    type: 'string',
    required: false,
  })
  username?: string;

  @property({
    type: 'string',
    required: false,
  })
  usernameReset?: boolean;

  @property({
    type: 'string',
    required: false,
  })
  instagramUsername?: string;

  @property({
    type: 'string'
  })
  firstName?: string;

  @property({
    type: 'string'
  })
  lastName?: string;

  @property({
    type: 'string'
  })
  passwordHash?: string;

  @property({
    type: 'string'
  })
  instagramAuthToken?: string;

  @property({
    type: 'string'
  })
  instagramUserId?: string;

  @property({
    type: 'string'
  })
  facebookAuthToken?: string;

  @property({
    type: 'string'
  })
  facebookUserId?: string;

  @property({
    type: 'string'
  })
  stripeCustomerId?: string;

  @property({
    type: 'string'
  })
  stripeSellerId?: string;

  @property({
    type: 'string'
  })
  profileImageUrl?: string;

  @property({
    type: 'string'
  })
  emailVerificationCode?: string;

  @property({
    type: 'string'
  })
  passwordVerificationCode?: string;

  @property({
    type: 'boolean'
  })
  emailVerified?: boolean;

  @property({
    type: 'string',
    required: true
  })
  type: string;

  @property.array(String, {
    required: false
  })
  followers: string[];

  @property.array(String, {
    required: false
  })
  following: string[];

  @property.array(String, {
    required: false
  })
  favorites: string[];

  @property.array(Address, {
    required: false
  })
  addresses: Address[];

  @property({
    type: Address,
    required: false
  })
  returnAddress: Address;

  @property.array(Card)
  cards: Card[];

  @property(UserPreferences)
  preferences: UserPreferences;

  @property.array(String, {
    required: false
  })
  usedPromos: string[];

  @property(UI)
  ui?: UI;

  @property(SellerDetails)
  seller?: SellerDetails;

  @hasMany(() => Product, { keyTo: 'sellerId' })
  products: Product[];

  @hasMany(() => Order, { keyTo: 'buyerId' })
  purchases: Order[];

  @hasMany(() => Order, { keyTo: 'sellerId' })
  sales: Order[];

  @hasMany(() => Review, { keyTo: 'sellerId' })
  reviews: Review[];

  @hasMany(() => Review, { keyTo: 'reviewerId' })
  ratings: Review[];

  @hasMany(() => Promo, { keyTo: 'sellerId' })
  promos: Promo[];
}

export interface UserRelations {
}

export type UserWithRelations = User & UserRelations;
