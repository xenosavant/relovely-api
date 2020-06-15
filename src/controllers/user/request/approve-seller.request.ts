import { Address } from '../../../models/address.model';
import { BankAccountRequest } from './bank-account.request.interface';
import { model, property } from '@loopback/repository';

@model()
export class ApproveSellerRequest {
  @property()
  email: string;
  @property()
  approved: boolean;
  @property()
  featured: boolean;
}
