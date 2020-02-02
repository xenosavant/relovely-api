import { UserList } from '../../user/response/user-list.interface';

export interface ProductDetail {
  id: string;
  title: string;
  seller: UserList;
  imageUrls: string[];
  videoUrls: string[];
  description: string;
  auction: boolean;
  auctionStart?: Date;
  auctionEnd?: Date;
  currentBid?: number;
  sizeId: string;
  size: string;
  price: number;
  sold: boolean;
  tags: string[];
}
