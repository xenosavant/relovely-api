import { Address } from '../../../models/address.model';
import { BankAccountRequest } from './bank-account.request.interface';
import { model, property } from '@loopback/repository';

@model()
export class SupportRequest {
  @property()
  body: string;
  @property()
  email: string;
}
