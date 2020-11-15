import { CloudinaryService } from "../../services";
import { service } from "@loopback/core";
import { getModelSchemaRef, requestBody, post, HttpErrors } from "@loopback/rest";
import { AuthResponse } from "../../authentication/auth-response";
import { SignatureRequest } from './signature.request';
import { SignatureResponse } from './signature.response';
import * as Sentry from '@sentry/node';

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';


export class StorageController {
  constructor(@service(CloudinaryService)
  public cloudinaryService: CloudinaryService) { }

  @post('/storage/signature', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(SignatureResponse)
          }
        },
      },
    },
  })
  async signature(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SignatureRequest),
        },
      },
    })
    request: SignatureRequest,
  ): Promise<SignatureResponse> {
    try {
      const result = await this.cloudinaryService.getSignature(request.folder, request.timestamp, request.uploadPreset, request.publicId);
      return { signature: result };
    } catch (e) {
      Sentry.captureException(e);
      throw new HttpErrors[500](`Something went wrong there...please try your upload again`);
    }
  }



}

