import { Review } from '../../../models/review.model';
import { UserList } from './user-list.interface';
import { Product } from '../../../models';

export class ReviewResponse {
  percentage: number;
  title: string;
  body: string;
  rating: number;
  date: Date;
  reviewer?: UserList;
  product?: Product;
}
