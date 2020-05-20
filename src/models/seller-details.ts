import { model, property } from '@loopback/repository';

@model()
export class SellerDetails {
  @property.array('string')
  missingInfo: string[];
  @property()
  suspended?: boolean;
  @property()
  verified?: boolean;
  @property()
  bankAccountLinked?: boolean;
  @property()
  verificationStatus?: 'unverified' | 'review' | 'rejected' | 'verified';
}
