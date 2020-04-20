import { model, property } from '@loopback/repository';

@model()
export class PriceFilter {
  @property()
  min: number;
  @property()
  max: number;
}
