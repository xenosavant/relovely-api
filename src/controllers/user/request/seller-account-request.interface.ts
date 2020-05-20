import { Address } from '../../../models/address.model';
import { BankAccountRequest } from './bank-account.request.interface';

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
  tosAcceptDate: number;
  bankAccount?: BankAccountRequest
}
