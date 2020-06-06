import moment from 'moment';
import { repository } from '@loopback/repository';
import { OrderRepository } from '../../repositories';
import { service } from '@loopback/core';
import { TaxService } from '../../services/tax/tax.service';
import { TaxCalculationResponse } from './tax-calculation.response';
import { TaxCalculationRequest } from './tax-calculation.request';
import { authenticate } from '@loopback/authentication';
import { post, getModelSchemaRef, requestBody } from '@loopback/rest';
import { AddressVerification } from '../../services/easypost/address-verification';


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
    return this.taxService.calculateTax(request);
  }

}
