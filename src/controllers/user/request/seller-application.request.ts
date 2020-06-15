import { Address } from '../../../models/address.model';
import { BankAccountRequest } from './bank-account.request.interface';
import { model, property } from '@loopback/repository';

@model()
export class SellerApplicationRequest {
  @property()
  firstName: string;
  @property()
  lastName: string;
  @property()
  address?: Address;
  @property()
  email: string;
  @property()
  instagramUsername: string;
  @property()
  channel1: string;
  @property()
  channel2: string;
  @property()
  channel3: string;
}
