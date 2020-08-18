import { Promo } from '../../../models/promo.model';

export class PromoResponse {
  promo?: Promo;
  rejectionReason?: string;
}
