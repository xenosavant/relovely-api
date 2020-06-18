import { model, property } from '@loopback/repository';

@model()
export class PreviewShipmentResponse {
  @property()
  shippingRate: number;
  @property()
  taxRate?: number;
  @property()
  shipmentId: string;
  @property()
  rateId: string;
  @property()
  error?: string;
}
