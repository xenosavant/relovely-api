import { property, model } from "@loopback/repository";

@model()
export class OAuthRequest {
  @property()
  code: string;
  @property()
  password?: string;
  @property()
  email?: string;
  @property()
  existing?: boolean;
}
