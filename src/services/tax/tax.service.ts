import { BindingScope, bind } from '@loopback/core';
import { TaxCalculationResponse } from '../../controllers/tax/tax-calculation.response';
import { TaxCalculationRequest } from '../../controllers/tax/tax-calculation.request';
import { resolve } from 'dns';

const Taxjar = require('taxjar');

const client = new Taxjar({
  apiKey: process.env.TAXJAR_API_KEY
});

const TAX_CODE = '20010';
@bind({ scope: BindingScope.CONTEXT })
export class TaxService {

  calculateTax(request: TaxCalculationRequest): Promise<TaxCalculationResponse> {
    // return new Promise((resolve, reject) => {
    //   client.taxForOrder({
    //     from_country: 'US',
    //     from_zip: request.fromAddress.zip,
    //     from_state: request.fromAddress.state,
    //     from_city: request.fromAddress.city,
    //     from_address: request.fromAddress.city,
    //     to_country: 'US',
    //     to_zip: request.toAddress.zip,
    //     to_state: request.fromAddress.state,
    //     to_city: request.fromAddress.city,
    //     to_street: request.fromAddress.line1,
    //     amount: request.price / 100,
    //     shipping: request.shippingCost / 100,
    //     nexus_addresses: [
    //       {
    //         id: request.sellerId,
    //         country: 'US',
    //         zip: request.fromAddress.zip,
    //         state: request.fromAddress.state,
    //         city: request.fromAddress.city,
    //         street: request.fromAddress.line1
    //       }
    //     ],
    //     line_items: [
    //       {
    //         id: '1',
    //         quantity: 1,
    //         product_tax_code: TAX_CODE,
    //         unit_price: request.price / 100,
    //         discount: 0
    //       }
    //     ]
    //   }).then((tax: any) => {
    //     resolve({ tax: tax.tax.amount_to_collect * 100 })
    //   })
    // })
    return new Promise((resolve, reject) => {
      resolve({ tax: 0 });
    })
  }
}
