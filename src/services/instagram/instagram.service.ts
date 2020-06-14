import { bind, /* inject, */ BindingScope, inject } from '@loopback/core';
import { AuthData } from '../response/auth-data';
import { BasicData } from '../response/basic-data';
import { ProfileData } from '../response/profile-data';
import { LongLivedTokenData } from '../response/long-lived-token-data';
import { REFUSED } from 'dns';
import { TokenServiceBindings } from '../../keys/token-service.bindings';
import { TokenService } from '@loopback/authentication';
import { HttpErrors } from '@loopback/rest';
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

  public async getAccessTokenMember(code: string): Promise<AuthData> {
    const options = {
      method: 'POST',
      uri: this.authenticationUrl,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: {
        code: code,
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.signupRedirectUri + '/member',
        grant_type: 'authorization_code'
      }
    }
    const response = JSON.parse(await client(options));
    return response;
  }

  public async getAccessTokenLink(code: string): Promise<AuthData> {
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

  public async getAccessTokenSeller(code: string): Promise<AuthData> {
    const options = {
      method: 'POST',
      uri: this.authenticationUrl,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      form: {
        code: code,
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.signupRedirectUri + '/seller',
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
      uri: `${this.graphUrl}/me?fields=username,id&access_token=${token}`,
      headers: { 'Content-Type': 'application/json' }
    }
    const response = JSON.parse(await client(options));
    return { username: response.username, id: response.id };
  }

  public async checkForProfile(username: string): Promise<boolean> {
    const options = {
      method: 'GET',
      uri: `${this.instagramUrl}/${username}/?__a=1`,
      resolveWithFullResponse: true,
      headers: { 'cookie': `ig_did=${process.env.INSTAGRAM_IG}; mid=${process.env.INSTAGRAM_MID}; rur=FRC; csrftoken=${process.env.INSTAGRAM_CSRF}; ds_user_id=12485442097; sessionid=${process.env.INSAGRAM_SESSIONID}; shbid=13778; shbts=1592158631.7574918; urlgen="{\"108.5.129.214\": 701\054 \"72.76.138.60\": 701}:1jkXC8:-NC0LG0Xap8_UZK6rIFldNygyGs` },
    }
    let result: boolean = false;
    try {
      let response = await client(options);
      if (response.statusCode === 404) {
        result = true;
      } else if (response.statusCode === 200) {
        const regex = new RegExp(`@${username}`, 'g');
        if (regex.test(response.body)) {
          result = true;
        }
      }
    } catch (error) {
      result = true;
    }
    return result;
  }
}
