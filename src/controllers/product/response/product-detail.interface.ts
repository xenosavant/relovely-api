import { UserList } from '../../user/response/user-list.interface';
import { ImageSet } from '../../../models/image-set';
import { VideoMetaData } from '../../../models/video-meta-data.model';

export interface ProductDetail {
  id: string;
  title: string;
  seller: UserList;
  images: ImageSet[];
  videos: VideoMetaData[];
  description: string;
  auction: boolean;
  sizeId: string;
  size: string;
  price: number;
  sold: boolean;
  tags: string[];
  weight: number;
}

export const productDetailFields = {
  currentBid: false,
  auctionEnd: false,
  auctionStart: false
}
