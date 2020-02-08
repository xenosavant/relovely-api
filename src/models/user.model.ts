import { Entity, model, property } from '@loopback/repository';

@model({ settings: { strict: true } })
export class User extends Entity {
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
  username: string;

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
  passwordSalt?: string;

  @property({
    type: 'string'
  })
  instagramAuthToken?: string;

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
  profileImageUrl?: string;

  @property({
    type: 'boolean',
    required: true,
  })
  isSeller: boolean;

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
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
