import { model, property } from '@loopback/repository';

@model({ settings: { strict: true } })
export class Card {
  @property()
  primary?: boolean;
  @property()
  name: string;
  @property()
  stripeId: string;
  @property()
  last4: string;
  @property()
  type: string;
  @property()
  expirationMonth: number;
  @property()
  expirationYear: number;
}
