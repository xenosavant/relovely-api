import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { Address } from '../../models/address.model';
import { AddressVerification } from './address-verification';
import { EasyPostAddress } from './easypost-adddress';
import { PreviewShipmentRequest } from '../../controllers/shipment/preview-shipment.request';
import { PreviewShipmentResponse } from '../../controllers/shipment/preview-shipment.response';
import { PurchaseShipmentResponse } from './purchase-shipment.response';
const EasyPost = require('@easypost/api');

const easypost = new EasyPost(process.env.EASYPOST_API_KEY);

@bind({ scope: BindingScope.CONTEXT })
export class EasyPostService {


  constructor() { }

  async verifyAddress(address: Address): Promise<AddressVerification> {
    const verifiableAddress = new easypost.Address({
      verify: ['delivery'],
      street1: address.line1,
      street2: address.line2,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country
    });
    return new Promise((resolve, reject) => {
      verifiableAddress.save().then((result: any) => {
        if (result.verifications.delivery.success) {
          result.zip = result.zip.slice(0, 5);
          if (this.compareAddresses(address, result)) {
            resolve({ success: true });
          } else {
            resolve({
              success: true, correctedAddress: {
                line1: result.street1,
                line2: result.street2,
                city: result.city,
                state: result.state,
                zip: result.zip,
                country: result.country
              }
            });
          }
        } else {
          resolve({
            success: false,
            errors: result.errors.map((e: any) => e.message)
          });
        }
      })
    })
  }


  createShipment(request: PreviewShipmentRequest): Promise<PreviewShipmentResponse> {

    const to = new easypost.Address({
      street1: request.toAddress.line1,
      street2: request.toAddress.line2,
      city: request.toAddress.city,
      state: request.toAddress.state,
      zip: request.toAddress.zip
    });
    const from = new easypost.Address({
      street1: request.fromAddress?.line1,
      street2: request.fromAddress?.line2,
      city: request.fromAddress?.city,
      state: request.fromAddress?.state,
      zip: request.fromAddress?.zip
    });
    const parcel = new easypost.Parcel({
      weight: request.weight,
      predefined_package: 'parcel',
      mode: 'test'
    });

    const shipment = new easypost.Shipment({
      to_address: to,
      from_address: from,
      parcel: parcel,
      carrier_accounts: ['USPS'],
    });

    return new Promise((resolve, reject) => {
      shipment.save().then((result: any) => {
        const rate = result.rates.find((r: any) => r.service === 'Priority')
        resolve({
          rateId: rate.id,
          shippingRate: parseFloat(rate.rate) * 100,
          shipmentId: result.id
        });
      })
    })
  }

  purchaseShipment(shipmentId: string, rateId: string): Promise<PurchaseShipmentResponse> {
    return new Promise((resolve, reject) => {
      easypost.Shipment.retrieve(shipmentId).then((shipment: any) => {
        const rate = shipment.rates.find((r: any) => r.service === 'Priority' && r.carrier === 'USPS');
        shipment.buy(rate, 0.0).then((response: any) => {
          resolve({
            trackerId: response.tracker.id,
            trackingUrl: response.tracker.public_url,
            postageLabelUrl: response.postage_label.label_url,
            shipmentId: shipment.id,
            shippingCost: parseFloat(rate.rate) * 100,
            address: {
              line1: shipment.to_address.street1,
              line2: shipment.to_address.street2,
              city: shipment.to_address.city,
              state: shipment.to_address.state,
              zip: shipment.to_address.zip.slice(0, 5),
              country: 'US'
            }
          });
        }, (error: any) => {
          console.log(error)
        })
      });
    })
  }






  private compareAddresses(address1: Address, address2: EasyPostAddress): boolean {
    return (address1.city === address2.city
      && address1.line1 === address2.street1
      && address1.line2 === address2.street2
      && address1.state === address2.state
      && address1.zip === address2.zip)
  }


}
