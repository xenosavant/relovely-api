import { BindingScope, bind } from '@loopback/core';
import { TaxCalculationResponse } from './tax-calculation.response';
import { TaxCalculationRequest } from './tax-calculation.request';
import { resolve } from 'dns';
import { HttpErrors } from '@loopback/rest';
import { TaxTransactionRequest } from './tax-transaction.request';
import { TaxNexusResponse } from './tax-nexus.rsponse';

const Taxjar = require('taxjar');
let client: any;
if (process.env.NODE_ENV === 'production') {
  client = new Taxjar({
    apiKey: process.env.TAXJAR_API_KEY
  })
} else {
  client = new Taxjar({
    apiKey: process.env.TAXJAR_API_KEY,
    apiUrl: Taxjar.SANDBOX_API_URL
  })
}

export const TAX_CODE = '20010';
@bind({ scope: BindingScope.CONTEXT })
export class TaxService {

  async calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResponse> {
    const nexuses = ['NJ'];
    if (nexuses.includes(request.toAddress.state) || nexuses.includes(request.fromAddress.state)) {
      return new Promise((resolve, reject) => {
        const taxRequest: any =
        {
          from_country: 'US',
          from_zip: request.fromAddress.zip,
          from_state: request.fromAddress.state,
          from_city: request.fromAddress.city,
          from_address: request.fromAddress.city,
          to_country: 'US',
          to_zip: request.toAddress.zip,
          to_state: request.toAddress.state,
          to_city: request.toAddress.city,
          to_street: request.toAddress.line1,
          amount: request.price / 100,
          shipping: request.shippingCost / 100,
          line_items: [
            {
              id: '1',
              quantity: 1,
              unit_price: request.price / 100,
              discount: 0
            }
          ]
        }
        if (['11', '12', '21', '22'].includes(request.categoryId)) {
          taxRequest.line_items[0].product_tax_code = TAX_CODE;
        }
        client.taxForOrder(taxRequest).then((tax: any) => {
          resolve({ tax: tax.tax.amount_to_collect * 100 });
        }, (error: any) => {
          resolve({ tax: 0, error: error.detail });
        })
      })
    } else {
      return { tax: 0 }
    }
  }

  createTransaction(request: TaxTransactionRequest): Promise<TaxCalculationResponse> {
    return new Promise((resolve, reject) => {
      client.createOrder(request).then((response: any) => {
        resolve({ tax: response.order.sales_tax });
      }, (error: any) => {
        resolve({ tax: 0, error: error.detail })
      })
    })
  }

}
