import { Address } from '../../models/address.model';

export interface OrderRequest {
  address: Address;
  paymentId: string;
}
