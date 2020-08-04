import { model, property } from '@loopback/repository';

@model()
export class PriceRange {
  @property(String)
  id: string;
  @property(Number)
  min?: number;
  @property(Number)
  max?: number;
}

@model()
export class UserPreferences {
  @property.array(String)
  sizes: string[];
  @property.array(String)
  colors: string[];
  @property.array(PriceRange)
  prices: PriceRange[];
}

@model()
export class UI {
  @property(Boolean)
  joinedMailingList: boolean;
}




