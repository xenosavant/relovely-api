import { bind, /* inject, */ BindingScope } from '@loopback/core';
import Stripe from 'stripe';
import { BankAccountRequest } from '../../controllers/user/request/bank-account.request.interface';
import { SellerAccountRequest } from '../../controllers/user/request/seller-account-request.interface';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2020-03-02',
  typescript: true
});


@bind({ scope: BindingScope.CONTEXT })
export class StripeService {


  constructor() { }

  async createSeller(seller: SellerAccountRequest, ip: string): Promise<string> {
    let bankAccountToken = null;
    if (seller.bankAccount) {
      bankAccountToken = await this.createBankAccount(seller.bankAccount);
    }
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
      },

    };
    if (bankAccountToken) {
      account.external_account = bankAccountToken;
    }
    const response = await stripe.accounts.create(account);
    return response.id;
  }

  async createBankAccount(account: BankAccountRequest): Promise<string> {
    const response = await stripe.tokens.create({
      bank_account: {
        account_holder_type: 'individual',
        country: 'US',
        currency: 'USD',
        account_holder_name: account.name,
        routing_number: account.routingNumber,
        account_number: account.accountNumber
      }
    });
    return response.id;
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
}
