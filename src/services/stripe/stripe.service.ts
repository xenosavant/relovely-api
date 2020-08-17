import { bind, /* inject, */ BindingScope } from '@loopback/core';
import Stripe from 'stripe';
import { BankAccountRequest } from '../../controllers/user/request/bank-account.request.interface';
import { SellerAccountRequest } from '../../controllers/user/request/seller-account-request.interface';
import { HttpErrors } from '@loopback/rest';
import { User } from '../../models';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2020-03-02',
  typescript: true
});


@bind({ scope: BindingScope.CONTEXT })
export class StripeService {


  constructor() { }

  async createSeller(seller: SellerAccountRequest, ip: string): Promise<Stripe.Account> {
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
          ssn_last_4: seller.ssn4,
          phone: '+1' + seller.phone,
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
      throw new HttpErrors.BadRequest(err.message || 'Something went wrong...please try again.');
    }
    return response;
  }

  async updateSeller(id: string, updates: Partial<SellerAccountRequest>): Promise<Stripe.Account> {
    const stripeUpdates: Stripe.AccountUpdateParams = {};
    stripeUpdates.individual = {};
    if (updates.address) {
      stripeUpdates.individual.address = {
        line1: updates.address.line1,
        line2: updates.address.line2,
        city: updates.address.city,
        state: updates.address.state,
        postal_code: updates.address.zip,
        country: 'US'
      }
    }
    if (updates.firstName || updates.lastName) {
      stripeUpdates.individual.first_name = updates.firstName;
      stripeUpdates.individual.last_name = updates.lastName;
    }
    if (updates.documentBack || updates.documentFront) {
      stripeUpdates.individual.verification = {
        document: {
          front: updates.documentFront,
          back: updates.documentBack
        }
      };
    }
    if (updates.phone) {
      stripeUpdates.individual.phone = updates.phone;
    }
    if (updates.birthDay && updates.birthMonth && updates.birthYear) {
      stripeUpdates.individual.dob = {
        month: updates.birthMonth,
        day: updates.birthDay,
        year: updates.birthYear
      }
    }
    if (updates.ssn) {
      stripeUpdates.individual.id_number = updates.ssn;
    }
    return await stripe.accounts.update(id, stripeUpdates);
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

  async addCard(cardId: string, customerId: string): Promise<string> {
    const result = await stripe.customers.createSource(customerId, { source: cardId });
    return result.id;
  }

  async changeDefaultPayment(customerId: string, sourceId: string) {
    return await stripe.customers.update(customerId, { default_source: sourceId });
  }

  async chargeCustomer(sellerId: string, amount: number, fees: number, paymentId: string, customerId?: string | undefined): Promise<string | null> {

    const param: Stripe.ChargeCreateParams = {
      transfer_data: {
        destination: sellerId,
        amount: amount - fees
      },
      amount: amount,
      source: paymentId,
      currency: 'USD',
      capture: true
    }
    if (customerId) {
      param.customer = customerId;
    }
    const charge = await stripe.charges.create(param);
    if (charge.outcome?.network_status === 'approved_by_network') {
      return charge.id
    } else {
      return null;
    }
  }

  async directCharge(sellerId: string, totalCharge: number, totalPayout: number, paymentId: string, customerId?: string | undefined): Promise<string | null> {
    const charge: Stripe.ChargeCreateParams = {
      amount: totalCharge,
      source: paymentId,
      currency: 'USD',
      capture: true,
    }
    if (customerId) {
      charge.customer = customerId;
    }
    // charge customer
    const chargeResponse = await stripe.charges.create(charge);
    if (chargeResponse.outcome?.network_status === 'approved_by_network') {
      // payout to seller
      const payout: Stripe.TransferCreateParams = {
        amount: totalPayout,
        currency: 'USD',
        destination: sellerId as string
      }
      await stripe.transfers.create(payout);
      return chargeResponse.id;
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

  retrieveEvent(body: Buffer, signature: any): Stripe.Event {
    return stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET as string);
  }

}
