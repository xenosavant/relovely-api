import { bind, BindingScope } from '@loopback/core';


const mailchimp = require('@mailchimp/mailchimp_marketing');

mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY,
  server: process.env.MAILCHIMP_SERVER_PREFIX
});

@bind({ scope: BindingScope.CONTEXT })
export class MailChimpService {

  public async addMember(emailAddress: string) {
    try {
      const response = await mailchimp.lists.addListMember(process.env.MAILCHIMP_MEMBER_LIST_ID, {
        email_address: emailAddress,
        status: "subscribed",
      });
    } catch {
      // do nothing
    }
  }

  public async addSeller(emailAddress: string) {
    try {
      const response = await mailchimp.lists.addListMember(process.env.MAILCHIMP_SELLER_LIST_ID, {
        email_address: emailAddress,
        status: "subscribed",
      });
    }
    catch {
      // do nothing
    }
  }
}
