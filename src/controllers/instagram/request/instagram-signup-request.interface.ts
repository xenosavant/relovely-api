import { property, model } from "@loopback/repository";

@model()
export class InstagramSignupRequest {
  @property()
  code: string;
  @property()
  password: string;
}
