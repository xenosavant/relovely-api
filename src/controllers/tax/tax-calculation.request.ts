import { model, property } from '@loopback/repository';
import { Address } from '../../models/address.model';

@model()
export class TaxCalculationRequest {
  @property()
  fromAddress: Address;
  @property()
  toAddress: Address;
  @property()
  shippingCost: number;
  @property()
  price: number;
  @property()
  sellerId: string;
}
