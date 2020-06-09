import { User } from "../models";
import { model, property } from "@loopback/repository";

@model()
export class AuthResponse {
  @property()
  user?: User;
  @property()
  jwt?: string;
  @property()
  existing?: boolean;
}
