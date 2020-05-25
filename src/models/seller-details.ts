import { model, property } from '@loopback/repository';

@model()
export class SellerDetails {
  @property.array('string')
  missingInfo: string[];
  @property.array('string')
  errors: string[];
  @property()
  bankAccountLinked?: boolean;
  @property()
  verificationStatus?: 'unverified' | 'review' | 'rejected' | 'verified';
}
