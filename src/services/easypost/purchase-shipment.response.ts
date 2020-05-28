import { Address } from '../../models/address.model';

export interface PurchaseShipmentResponse {
  trackerId: string;
  trackingUrl: string;
  postageLabelUrl: string;
  shipmentId: string;
  shippingCost: number;
  address: Address;
}
