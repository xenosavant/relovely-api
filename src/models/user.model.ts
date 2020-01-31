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

  // Define well-known properties here

  // // Indexer property to allow additional data
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // [prop: string]: any;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
