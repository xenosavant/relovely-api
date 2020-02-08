import { bind, /* inject, */ BindingScope } from '@loopback/core';
import { AuthData } from './response/auth-data';
import { BasicData } from './response/basic-data';
import { ProfileData } from './response/profile-data';
import { REFUSED } from 'dns';
const client = require('request-promise');

@bind({ scope: BindingScope.CONTEXT })
export class InstagramService {

  private graphUrl: string;
  private authenticationUrl: string;
  private appId: string;
  private appSecret: string;
  private redirectUri: string;
  private instagramUrl: string;

  constructor(/* Add @inject to inject parameters */) {
    this.graphUrl = 'https://graph.instagram.com';
    this.authenticationUrl = 'https://api.instagram.com/oauth/access_token';
    this.instagramUrl = 'https://www.instagram.com';
    this.appId = process.env.INSTAGRAM_APP_ID as string;
    this.appSecret = process.env.INSTAGRAM_APP_SECRET as string;
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI as string;
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
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      }
    }
    const response = JSON.parse(await client(options));
    return response;
  }

  public async getBasicUserData(token: string): Promise<BasicData> {
    const options = {
      method: 'GET',
      uri: `${this.graphUrl}/me?fields=username&access_token=${token}`,
      headers: { 'Content-Type': 'application/json' }
    }
    const response = JSON.parse(await client(options));
    return { username: response.username };
  }

  public async getUserProfile(username: string): Promise<ProfileData> {
    const options = {
      method: 'GET',
      uri: `${this.instagramUrl}/${username}/?__a=1`
    }
    const response = JSON.parse(await client(options));
    return response;
  }
}
