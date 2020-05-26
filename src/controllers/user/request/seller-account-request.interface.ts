import { Address } from '../../../models/address.model';
import { BankAccountRequest } from './bank-account.request.interface';
import { model, property } from '@loopback/repository';

@model()
export class SellerAccountRequest {
  @property()
  firstName: string;
  @property()
  lastName: string;
  @property()
  birthDay: number;
  @property()
  birthMonth: number;
  @property()
  birthYear: number;
  @property()
  address: Address;
  @property()
  email: string;
  @property()
  phone: string;
  @property()
  ssn4?: string;
  @property()
  ssn?: string;
  @property()
  tosAcceptDate: number;
  @property()
  bankAccount?: BankAccountRequest
  @property()
  documentFront: string;
  @property()
  documentBack: string;
}
