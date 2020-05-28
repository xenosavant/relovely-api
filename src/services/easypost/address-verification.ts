import { Address } from '../../models/address.model';
import { model, property } from '@loopback/repository';

@model()
export class AddressVerification {
  @property()
  success: boolean;
  @property()
  correctedAddress?: Address;
  @property.array(String)
  errors?: string[];
}
