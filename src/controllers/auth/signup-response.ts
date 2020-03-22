import { model, property } from "@loopback/repository";

@model()
export class SignupResponse {
  @property()
  success: boolean;
}
