import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { format } from 'path';


@bind({ scope: BindingScope.CONTEXT })
export class SendgridService {

  private fromEmail = 'relovely@relovely.com';
  private client: any;

  constructor() {
    this.client = require("@sendgrid/mail");
    this.client.setApiKey(process.env.SENDGRID_API_KEY as string);
  }

  public async sendEmail(to: string, subject: string, html: string, from: string = this.fromEmail) {
    const msg = {
      to: to,
      from: from,
      subject: subject,
      html: html
    };

    await this.client.send(msg);
  }

  public async sendTransactional(data: any, templateId: string, to: string) {
    try {
      await this.client.send({
        from: 'relovely@relovely.com',
        personalizations: [
          {
            to: [
              {
                email: to
              }
            ],
            dynamic_template_data: data
          }
        ],
        template_id: templateId
      })
    }

    catch (error) {
      const e = error;
    }

  }
}
