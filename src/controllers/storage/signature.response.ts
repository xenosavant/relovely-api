
import { property, model } from "@loopback/repository";

@model()
export class SignatureResponse {
  @property()
  signature: string;
}
