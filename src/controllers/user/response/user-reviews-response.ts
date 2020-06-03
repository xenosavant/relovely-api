import { Review } from '../../../models/review.model';
import { ReviewResponse } from './review-response';

export interface UserReviewsResponse {
  name: string;
  reviews: ReviewResponse[];
}
