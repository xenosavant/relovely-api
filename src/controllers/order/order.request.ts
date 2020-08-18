import { Address } from '../../models/address.model';

export interface OrderRequest {
  address: Address;
  paymentId: string;
  shipmentId: string;
  email?: string;
  last4?: string;
  cardType?: string;
  createAccount?: boolean;
  joinMailingList?: boolean;
  promoCode?: string;
}
