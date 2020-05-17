import { Address } from '../../../models/address.model';

export interface SellerAccountRequest {
  firstName: string;
  lastName: string;
  birthDay: number;
  birthMonth: number;
  birthYear: number;
  address: Address;
  email: string;
  phone: string;
  ssn: string;
}
