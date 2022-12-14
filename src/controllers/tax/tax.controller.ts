
import { repository } from '@loopback/repository';
import { OrderRepository } from '../../repositories';
import { service } from '@loopback/core';
import { TaxService } from '../../services/tax/tax.service';
import { TaxCalculationResponse } from '../../services/tax/tax-calculation.response';
import { TaxCalculationRequest } from '../../services/tax/tax-calculation.request';
import { authenticate } from '@loopback/authentication';
import { post, getModelSchemaRef, requestBody, HttpErrors } from '@loopback/rest';
import * as Sentry from '@sentry/node';

export class TaxController {
  constructor(
    @service(TaxService)
    public taxService: TaxService) {

  }

  @authenticate('jwt')
  @post('/tax/calculate-tax', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(TaxCalculationResponse) } },
      },
    },
  })
  async verify(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(TaxCalculationRequest),
        },
      },
    }) request: TaxCalculationRequest
  ): Promise<TaxCalculationResponse> {
    try {
      return this.taxService.calculateTax(request);
    } catch (e) {
      Sentry.captureException(e);
      throw new HttpErrors[500](`Something went wrong there...we're working on it`);
    }

  }

}
