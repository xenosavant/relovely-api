import { Lookup } from "../../models";
import { property, model } from "@loopback/repository";

@model()
export class LookupDataResponse {
  @property()
  categories: Lookup;
  @property()
  sizes: Lookup;
}
