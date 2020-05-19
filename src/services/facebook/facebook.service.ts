import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { AuthData } from '../response/auth-data';
import { BasicData } from '../response/basic-data';
import { ProfileData } from '../response/profile-data';
import { LongLivedTokenData } from '../response/long-lived-token-data';
import { FacebookUser } from '../../authentication/facebook-user';

const client = require('request-promise');

@bind({ scope: BindingScope.CONTEXT })
export class FacebookService {

  private graphUrl: string;
  private authenticationUrl: string;
  private appId: string;
  private appSecret: string;
  private redirectUri: string;

  constructor(/* Add @inject to inject parameters */) {
    this.graphUrl = 'https://graph.facebook.com';
    this.authenticationUrl = 'https://graph.facebook.com/v6.0/oauth/access_token';
    this.appId = process.env.FACEBOOK_APP_ID as string;
    this.appSecret = process.env.FACEBOOK_APP_SECRET as string;
    this.redirectUri = process.env.FACEBOOK_AUTH_REDIRECT_URI as string;
  }

  public async getAccessToken(code: string, type: 'signin' | 'signup' | 'link'): Promise<AuthData> {
    let redirect_uri: string = this.redirectUri;
    if (type) {
      redirect_uri = `${redirect_uri}?type=${type}`;
    }
    const options = {
      method: 'GET',
      uri: `${this.authenticationUrl}?code=${code}&client_id=${this.appId}&client_secret=${this.appSecret}&redirect_uri=${redirect_uri}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
    const response = JSON.parse(await client(options));
    return response;
  }

  public async getBasicUserData(token: string): Promise<FacebookUser> {
    const options = {
      method: 'GET',
      uri: `${this.graphUrl}/me?access_token=${token}&fields=id,name`,
      headers: { 'Content-Type': 'application/json' }
    }
    const response = JSON.parse(await client(options));
    return response;
  }

  public async getProfilePicture(token: string): Promise<any> {
    const options = {
      method: 'GET',
      uri: `${this.graphUrl}/me/picture?access_token=${token}&height=500&width=500`,
      encoding: null
    }
    return await client(options);
  }

  public async getlongLivedAccessToken(token: string): Promise<LongLivedTokenData> {
    const options = {
      method: 'GET',
      uri: `${this.graphUrl}/v6.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${token}`
    }
    return JSON.parse(await client(options));
  }
}
