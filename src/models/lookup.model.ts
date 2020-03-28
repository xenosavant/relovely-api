import { Entity, model, property } from '@loopback/repository';

@model({ settings: { strict: true } })
export class Lookup extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    id: true,
    generated: false,
  })
  key?: string;

  @property({
    type: 'string',
    required: true,
  })
  json: string;
}

export interface LookupRelations {
  // describe navigational properties here
}

export type LookupWithRelations = Lookup & LookupRelations;
