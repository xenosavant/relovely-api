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
    required: true,
  })
  firstName: string;

  @property({
    type: 'string',
    required: true,
  })
  lastName: string;

  @property({
    type: 'string',
    required: false,
  })
  profileImageUrl: string;

  @property({
    type: 'boolean',
    required: true,
  })
  isSeller: boolean;

  @property({
    type: 'string',
  })
  instagramAccessToken?: string;

  @property.array(String, {
    type: 'string',
    required: true,
  })
  followers: string[];

  @property.array(String, {
    type: 'string',
    required: true,
  })
  following: string[];

  @property.array(String, {
    type: 'string',
    required: true,
  })
  sales: string[];

  @property.array(String, {
    type: 'string',
    required: true,
  })
  listings: string[];

  @property.array(String, {
    type: 'string',
    required: true,
  })
  favorites: string[];
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
