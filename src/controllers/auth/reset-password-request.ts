import { model, property } from "@loopback/repository";

@model()
export class ResetPasswordRequest {
  @property()
  password: string;
  @property()
  code: string;
}
