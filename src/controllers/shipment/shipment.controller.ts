import { authenticate } from '@loopback/authentication';
import { inject, service } from '@loopback/core';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { SecurityBindings } from '@loopback/security';
import { post, getModelSchemaRef, param, requestBody, HttpErrors } from '@loopback/rest';
import { AddressVerification } from '../../services/easypost/address-verification';
import { EasyPostService } from '../../services/easypost/easypost.service';
import { Address } from '../../models/address.model';
import * as Sentry from '@sentry/node';

export class ShipmentController {
  constructor(
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile,
    @service(EasyPostService)
    public easypostService: EasyPostService
  ) { }

  @post('/shipments/verify-address', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(AddressVerification) } },
      },
    },
  })
  async verify(
    @requestBody() address: Omit<Address, 'name' | 'id'>
  ): Promise<AddressVerification> {
    try {
      return await this.easypostService.verifyAddress(address);
    } catch (e) {
      Sentry.captureException(e);
      throw new HttpErrors[500](`Something went wrong there...we're working on it`);
    }
  }
}
