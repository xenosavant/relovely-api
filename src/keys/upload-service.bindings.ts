import { BindingKey } from '@loopback/core';

import { RequestHandler } from 'express-serve-static-core';

export type FileUploadHandler = RequestHandler;

export const FILE_UPLOAD_SERVICE = BindingKey.create<FileUploadHandler>(
  'services.FileUpload',
);
