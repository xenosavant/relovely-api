import { Entity, model, property, hasMany } from '@loopback/repository';
import { Product } from './product.model';

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
    type: 'string',
    required: true
  })
  signedInWithInstagram: boolean;

  @property({
    type: 'string'
  })
  facebookAuthToken?: string;

  @property({
    type: 'string',
    required: true
  })
  signedInWithFacebook: boolean;

  @property({
    type: 'string'
  })
  facebookUserId?: string;

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
    type: 'string'
  })
  emailVerified?: boolean;

  @property({
    type: 'string',
    required: true,
  })
  type: string;

  @property.array(String, {
    type: 'string',
    required: false,
  })
  followers?: string[];

  @property.array(String, {
    type: 'string',
    required: false,
  })
  following?: string[];

  @property.array(String, {
    type: 'string',
    required: false,
  })
  sales?: string[];

  @property.array(String, {
    type: 'string',
    required: false,
  })
  listings?: string[];

  @property.array(String, {
    type: 'string',
    required: false,
  })
  favorites?: string[];

  @hasMany(() => Product, { keyTo: 'sellerId' })
  products: Product[];
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
