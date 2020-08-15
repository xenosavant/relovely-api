import { model, property } from '@loopback/repository';

@model()
export class MailingListSubscriptionRequest {
  @property()
  email: string
}
