import { model, property } from '@loopback/repository';
import { Address } from './address.model';

@model()
export class SellerDetails {
  @property.array('string')
  missingInfo: string[];
  @property.array('string')
  errors: string[];
  @property()
  verificationStatus?: 'unverified' | 'review' | 'rejected' | 'verified';
  @property()
  address?: Address
  @property()
  verified?: boolean;
}
