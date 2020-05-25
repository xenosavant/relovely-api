import { bind, /* inject, */ BindingScope } from '@loopback/core';
import Stripe from 'stripe';
import { BankAccountRequest } from '../../controllers/user/request/bank-account.request.interface';
import { SellerAccountRequest } from '../../controllers/user/request/seller-account-request.interface';
import { HttpErrors } from '@loopback/rest';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2020-03-02',
  typescript: true
});


@bind({ scope: BindingScope.CONTEXT })
export class StripeService {


  constructor() { }

  async createSeller(seller: SellerAccountRequest, ip: string): Promise<string> {
    let response;
    try {
      const account: Stripe.AccountCreateParams = {
        business_type: 'individual',
        business_profile: {
          mcc: '5691',
          product_description: 'clothing & accessories',
        },
        tos_acceptance: {
          date: seller.tosAcceptDate,
          ip: ip
        },
        requested_capabilities: [
          'card_payments', 'transfers'
        ],
        type: 'custom',
        individual: {
          first_name: seller.firstName,
          last_name: seller.lastName,
          address: {
            line1: seller.address.line1,
            line2: seller.address.line2,
            city: seller.address.city,
            state: seller.address.state,
            postal_code: seller.address.zip,
            country: 'US'
          },
          dob: {
            month: seller.birthMonth,
            day: seller.birthDay,
            year: seller.birthYear
          },
          email: seller.email,
          id_number: seller.ssn,
          phone: '+1' + seller.phone,
          verification: {
            document: {
              front: seller.documentFront,
              back: seller.documentBack
            }
          }
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily',
              delay_days: 'minimum'
            }
          }
        }
      };
      response = await stripe.accounts.create(account);
    }
    catch (err) {
      throw new HttpErrors.BadRequest(err.message || 'Verification failed. Please try again.');
    }
    return response.id;
  }

  async updateSeller(id: string, updates: Partial<SellerAccountRequest>): Promise<Stripe.Account> {
    return await stripe.accounts.update(id, updates);
  }

  async createBankAccount(sellerId: string, account: BankAccountRequest): Promise<string> {
    const response = await stripe.tokens.create({
      bank_account: {
        account_holder_type: 'individual',
        country: 'US',
        currency: 'USD',
        account_holder_name: account.firstName + ' ' + account.lastName,
        routing_number: account.routingNumber,
        account_number: account.accountNumber
      }
    });
    if (response.id) {
      const token = await stripe.accounts.createExternalAccount(sellerId, { default_for_currency: true, external_account: response.id });
      if (token.id) {
        return response.id;
      }
    }
    throw new HttpErrors.Forbidden('Invalid bank account information')
  }

  async createCustomer(email: string): Promise<string> {
    const response = await stripe.customers.create({ email: email });
    return response.id;
  }

  async chargeCustomer(sellerAccountId: string, amount: number, cardId: string): Promise<string | null> {
    const param: Stripe.ChargeCreateParams = {
      destination: {
        account: sellerAccountId,
        amount: amount
      },
      source: cardId,
      currency: 'USD',
      capture: true
    }
    const charge = await stripe.charges.create(param);
    if (charge.outcome?.network_status === 'approved_by_network') {
      return charge.id
    } else {
      return null;
    }
  }

  async uploadFile(file: Buffer): Promise<string> {
    const result = await stripe.files.create({
      file: {
        data: file,
        name: 'file.jpg',
        type: 'application/octet-stream',
      },
      purpose: 'identity_document'
    });
    return result.id;
  }

  retrieveEvent(body: any, signature: any): Stripe.Event {
    return stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET as string);
  }

}
