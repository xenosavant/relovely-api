import { model, property } from "@loopback/repository";

@model()
export class AuthRequest {
  @property()
  email: string;
  @property()
  username: string;
  @property()
  password: string;
}
