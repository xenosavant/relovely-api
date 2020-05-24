import { model, property } from '@loopback/repository';

@model({ settings: { strict: true } })
export class Card {
  @property()
  name: string;
  @property()
  stripeId: string;
  @property()
  last4: string;
  @property()
  type: 'mastercard' | 'amex' | 'visa' | 'discover';
  @property()
  expirationMonth: number;
  @property()
  expirationYear: number;
  @property()
  primary?: boolean;
}
