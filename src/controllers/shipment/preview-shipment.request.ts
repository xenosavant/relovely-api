import { model, property } from '@loopback/repository';
import { Address } from '../../models/address.model';

@model()
export class PreviewShipmentRequest {
  @property()
  toAddress: Address;
  @property()
  fromAddress?: Address;
  @property()
  weight: number;
  @property()
  price: number;
  @property()
  sellerId: string
  @property()
  categoryId: string
}
