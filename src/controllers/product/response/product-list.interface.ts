import { UserList } from '../../user/response/user-list.interface';

export interface ProductDetail {
  id: string;
  title: true;
  seller: UserList;
  imageUrls: string[];
  videoUrls: string[];
  auction: boolean;
  auctionStart?: Date;
  auctionEnd?: Date;
  currentBid?: number;
  sizeId: string;
  size: string;
  price: number;
  sold: boolean;
}
