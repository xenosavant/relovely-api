import { property, model } from "@loopback/repository";

@model()
export class SignatureRequest {
  @property()
  folder: string;
  @property()
  timestamp: string;
  @property()
  uploadPreset: string;
  @property()
  publicId?: string;
}
