import { model, property } from '@loopback/repository';
import { Address } from './address.model';

@model()
export class SellerDetails {
  @property.array('string')
  missingInfo: string[];
  @property.array('string')
  errors: string[];
  @property()
  verificationStatus: string;
  @property()
  address?: Address;
  @property()
  approved?: boolean;
  @property()
  featured?: boolean;
  @property()
  featuredOrder?: number;
  @property()
  freeSales?: number;
  @property.array('string')
  socialChannels?: string[];
  @property()
  birthDay?: number;
  @property()
  birthMonth?: number;
  @property()
  birthYear?: number;
}
