import { bind, /* inject, */ BindingScope, inject } from '@loopback/core';
import { AuthData } from '../response/auth-data';
import { BasicData } from '../response/basic-data';
import { ProfileData } from '../response/profile-data';
import { LongLivedTokenData } from '../response/long-lived-token-data';
import { REFUSED } from 'dns';
import { TokenServiceBindings } from '../../keys/token-service.bindings';
import { TokenService } from '@loopback/authentication';
const client = require('request-promise');

@bind({ scope: BindingScope.CONTEXT })
export class InstagramService {

  private graphUrl: string;
  private authenticationUrl: string;
  private appId: string;
  private appSecret: string;
  private signupRedirectUri: string;
  private instagramUrl: string;

  constructor() {
    this.graphUrl = 'https://graph.instagram.com';
    this.authenticationUrl = 'https://api.instagram.com/oauth/access_token';
    this.instagramUrl = 'https://www.instagram.com';
    this.appId = process.env.INSTAGRAM_APP_ID as string;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET as string;
    this.signupRedirectUri = process.env.INSTAGRAM_AUTH_REDIRECT_URI as string;
  }

  public async getAccessToken(code: string): Promise<AuthData> {
    const options = {
      method: 'POST',
      uri: this.authenticationUrl,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: {
        code: code,
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.signupRedirectUri,
        grant_type: 'authorization_code'
      }
    }
    const response = JSON.parse(await client(options));
    return response;
  }

  public async getlongLivedAccessToken(token: string): Promise<LongLivedTokenData> {
    const options = {
      method: 'GET',
      uri: `${this.graphUrl}/access_token?grant_type=ig_exchange_token&client_secret=${this.appSecret}&access_token=${token}`
    }
    return JSON.parse(await client(options));
  }

  public async getBasicUserData(token: string): Promise<BasicData> {
    const options = {
      method: 'GET',
      uri: `${this.graphUrl}/me?fields=username&access_token=${token}`,
      headers: { 'Content-Type': 'application/json' }
    }
    const response = await client(options);
    return { username: response.username };
  }

  public async getUserProfile(username: string): Promise<any> {
    const options = {
      method: 'GET',
      uri: `${this.instagramUrl}/${username}?__a=1`
    }
    const response = await client(options);

    return response;
  }
}
