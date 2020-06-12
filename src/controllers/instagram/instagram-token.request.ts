import { property, model } from "@loopback/repository";

@model()
export class InstagramTokenRequest {
  @property()
  code: string;
}
