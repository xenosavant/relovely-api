import { model, property } from "@loopback/repository";

@model({ settings: { strict: true } })
export class ImageSet {
  @property()
  cropped: string;
  @property()
  original: string;
}
