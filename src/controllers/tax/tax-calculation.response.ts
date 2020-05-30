import { model, property } from '@loopback/repository';

@model()
export class TaxCalculationResponse {
  @property()
  tax: number;
}
