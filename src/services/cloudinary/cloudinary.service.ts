import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { v2, UploadApiOptions } from 'cloudinary';

@bind({ scope: BindingScope.CONTEXT })
export class CloudinaryService {

  private key: string;
  private secret: string;
  private imageUploadPreset: string;

  constructor(/* Add @inject to inject parameters */) {
    this.key = process.env.CLOUDINARY_API_KEY as string;
    this.secret = process.env.CLOUDINARY_API_SECRET as string;
    this.imageUploadPreset = process.env.CLOUDINARY_IMAGE_UPLOAD_PRESET as string;
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
  }

  public async getSignature(folder: string, timestamp: string, preset: string, publicId?: string): Promise<string> {
    const payload: any = { timestamp: timestamp, folder: folder, upload_preset: preset };
    if (publicId) {
      payload['public_id'] = publicId;
      payload['unique_filename'] = 'false';
    }
    return await v2.utils.api_sign_request(payload, this.secret);
  }

  public async upload(image: string, id: string) {
    const timestamp = Date.now();
    const signature = await this.getSignature(`${id}/images`, timestamp.toString(), 'images');
    return await v2.uploader.upload(image, {
      upload_preset: this.imageUploadPreset,
      signature: signature,
      folder: `${id}/images`,
      api_key: this.key,
      timestamp: timestamp
    });
  }

}
