import { model, property } from "@loopback/repository";

@model({ settings: { strict: true } })
export class VideoMetaData {
  @property()
  width: number;
  @property()
  height: number;
  @property()
  url: string;
  @property()
  publicId: string;
  @property()
  bytes: number;
  @property()
  format: string;
}
