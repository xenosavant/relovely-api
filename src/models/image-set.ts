import { model } from "@loopback/repository";

@model({ settings: { strict: true } })
export class ImageSet {
  cropped: string;
  original: string;
}
