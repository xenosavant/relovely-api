import { User } from "../models";
import { model, property } from "@loopback/repository";

@model()
export class OAuthResponse {
  @property()
  user?: User;
  @property()
  jwt?: string;
  @property()
  error?: string;
}
