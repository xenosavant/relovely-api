import { ProductDetail } from './product-detail.interface';
import { ProductList } from './product-list.interface';

export interface ProductDetailResponse {
  product: ProductDetail;
  more: ProductList[];
}
