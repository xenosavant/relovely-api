import { model, property } from "@loopback/repository";

@model()
export class VerifyEmailRequest {
  @property()
  code: string;
}
