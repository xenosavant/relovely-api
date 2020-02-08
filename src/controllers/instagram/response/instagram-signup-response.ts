import { User } from "../../../models";
import { model, property } from "@loopback/repository";

@model()
export class InstagramSignupResponse {
  @property()
  user: User;
  @property()
  jwt: string;
}
