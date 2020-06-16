import { UserList } from '../../user/response/user-list.interface';

export interface ProductList {
  id: string;
  title: true;
  seller: UserList;
  imageUrls: string[];
  sizeId: string;
  price: number;
  retailPrice: number;
  sold: boolean;
}

export const productListFields = {
  id: true, title: true, sellerId: true, images: true, videos: true, sizeId: true, size: true, price: true, sold: true, retailPrice: true
}
