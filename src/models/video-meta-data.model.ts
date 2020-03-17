import { model } from "@loopback/repository";

@model({ settings: { strict: true } })
export class VideoMetaData {
  width: number;
  height: number;
  url: string;
  publicId: string;
  bytes: number;
}
