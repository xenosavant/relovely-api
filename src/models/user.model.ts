import { Entity, model, property, hasMany } from '@loopback/repository';
import { Product, ProductWithRelations } from './product.model';
import { Order } from './order.model';
import { UserPreferences } from './user-preferences.model';
import { Address } from './address.model';
import { Card } from './card.model';
import { SellerDetails } from './seller-details';

@model({ settings: { strict: true, hiddenProperties: ['passwordHash'] } })
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: false,
  })
  email?: string;

  @property({
    type: 'string',
    required: false,
  })
  username?: string;

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
    type: 'boolean',
    required: true
  })
  signedInWithFacebook?: boolean;

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

  @property.array(Card)
  cards: Card[];

  @property(UserPreferences)
  preferences: UserPreferences;

  @property(SellerDetails)
  seller?: SellerDetails;

  @hasMany(() => Product, { keyTo: 'sellerId' })
  products: Product[];

  @hasMany(() => Order, { keyTo: 'buyerId' })
  purchases: Order[];

  @hasMany(() => Order, { keyTo: 'sellerId' })
  sales: Order[];
}

export interface UserRelations {

}

export type UserWithRelations = User & UserRelations;
