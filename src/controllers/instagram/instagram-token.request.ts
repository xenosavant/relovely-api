import { property, model } from "@loopback/repository";

@model()
export class InstagramTokenRequest {
  @property()
  token: string;
  @property()
  type: string;
}
