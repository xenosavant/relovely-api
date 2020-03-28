import { model, property } from "@loopback/repository";

@model()
export class PasswordEmailRequest {
  @property()
  identifier: string;
}
