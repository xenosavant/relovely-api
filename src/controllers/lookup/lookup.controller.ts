// Uncomment these imports to begin using these cool features!

import { repository } from "@loopback/repository";
import { LookupRepository } from "../../repositories";
import { post, getModelSchemaRef, requestBody, get } from "@loopback/rest";
import { AuthResponse } from "../../authentication/auth-response";
import { OAuthRequest } from "../../authentication/oauth-request";
import { Lookup } from "../../models";
import { LookupDataResponse } from './lookup-data.response';

// import {inject} from '@loopback/context';


export class LookupController {
  constructor(@repository(LookupRepository)
  public lookupRepository: LookupRepository, ) { }

  @post('/lookup', {
    responses: {
      '200': {
        description: 'User model instance'
      },
    },
  })
  async post(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Lookup),
        },
      },
    })
    data: Lookup,
  ): Promise<void> {
    await this.lookupRepository.create(data);
  }

  @get('/lookup', {
    responses: {
      '200': {
        description: 'User model instance'
      },
      content: {
        'application/json': {
          schema: getModelSchemaRef(LookupDataResponse)
        }
      },
    },
  })
  async signup(): Promise<LookupDataResponse> {
    return {
      categories: (await this.lookupRepository.findOne({ where: { key: 'categories' } }) as Lookup),
      sizes: (await this.lookupRepository.findOne({ where: { key: 'sizes' } }) as Lookup),
      colors: (await this.lookupRepository.findOne({ where: { key: 'colors' } }) as Lookup),
      prices: (await this.lookupRepository.findOne({ where: { key: 'prices' } }) as Lookup)
    }
  }
}
