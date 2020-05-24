import { model, property } from '@loopback/repository';

@model()
export class BankAccountRequest {
  @property()
  routingNumber: string;
  @property()
  accountNumber: string;
  @property()
  firstName: string;
  @property()
  lastName: string;
}
