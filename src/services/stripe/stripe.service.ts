import { bind, /* inject, */ BindingScope } from '@loopback/core';
import Stripe from 'stripe';
import { request } from 'http';
import { BankAccountRequest } from '../../controllers/user/request/bank-account.request.interface';
import { SellerAccountRequest } from '../../controllers/user/request/seller-account-request.interface';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2020-03-02',
  typescript: true
});


@bind({ scope: BindingScope.CONTEXT })
export class StripeService {

  private publishableLKey: string;

  constructor() {
    this.publishableLKey = process.env.STRIPE_PUBLISHABLE_KEY as string;
  }

  async createSeller(seller: SellerAccountRequest, ip: string, bankAccount: string | undefined = undefined): Promise<string> {
    const account: Stripe.AccountCreateParams = {
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
        phone: seller.phone,
      }
    };
    if (bankAccount) {
      account.external_account = bankAccount;
    }
    const response = await stripe.accounts.create();
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

  async chargeCustomer(sellerAccountId: string, amount: number, CreditCardId: string) {
    stripe.paymentIntents.create({
      transfer_data: {
        destination: sellerAccountId
      },
      amount: amount,
      payment_method: CreditCardId,
      currency: 'USD'
    })
  }
}
