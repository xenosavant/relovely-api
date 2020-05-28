import { model, property } from '@loopback/repository';

@model({ settings: { strict: true } })
export class Address {
  @property()
  name?: string;
  @property()
  line1: string;
  @property()
  line2: string;
  @property()
  state: string;
  @property()
  city: string;
  @property()
  zip: string;
  @property()
  country: string;
  @property()
  primary?: boolean;
}
