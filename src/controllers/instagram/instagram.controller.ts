import { post, getModelSchemaRef, requestBody, HttpErrors } from "@loopback/rest";
import { User, UserWithRelations } from "../../models";
import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { InstagramService, SendgridService } from "../../services";
import { service, inject } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService, authenticate } from "@loopback/authentication";
import { AuthResponse } from '../../authentication/auth-response';
import { userDetailFields } from "../user/response/user-list.interface";
import { AppUserProfile } from "../../authentication/app-user-profile";
import { OAuthRequest } from "../../authentication/oauth-request";
import { AppCredentialService } from "../../services/authentication/credential.service";
import { StripeService } from '../../services/stripe/stripe.service';
import * as crypto from 'crypto'
import { BasicData } from '../../services/response/basic-data';
import { InstagramTokenResponse } from './instagram-token.response';
import { InstagramTokenRequest } from './instagram-token.request';
import { AuthData } from '../../services/response/auth-data';
import { LongLivedTokenData } from '../../services/response/long-lived-token-data';
import { SecurityBindings } from '@loopback/security';

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';


export class InstagramController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @service(InstagramService)
    public instagramService: InstagramService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
    @inject('services.AppCredentialService')
    public credentialService: AppCredentialService,
    @service(StripeService)
    public stripeService: StripeService,
    @service(SendgridService)
    public sendGridService: SendgridService,
    @inject(SecurityBindings.USER, { optional: true }) private user: AppUserProfile,) { }

  @post('/instagram/sell', {
    responses: {
      '204': {
        description: 'Success'
      },
    },
  })
  async sell(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(OAuthRequest),
        },
      },
    })
    request: OAuthRequest,
  ): Promise<void> {

    if (!request.email) {
      throw new HttpErrors.BadRequest('Email is required');
    }

    let data: BasicData;
    try {
      data = await this.instagramService.getBasicUserData(request.code);
    }
    catch {
      throw new HttpErrors.BadRequest('Invalid account')
    }

    const longLivedToken = request.code
    const existingUser = (await this.userRepository.findOne({ where: { instagramUsername: data.username } })) as UserWithRelations;


    if (existingUser) {
      if (existingUser.seller && existingUser.seller.approved) {
        throw new HttpErrors.Conflict('That Instagram account is already linked to an existing user');
      }
    }

    const existingEmail = (await this.userRepository.findOne({ where: { email: request.email } })) as UserWithRelations;

    if (existingEmail) {
      throw new HttpErrors.Conflict('That email is not available.');
    }

    const stripeId = await this.stripeService.createCustomer(request.email as string);

    const rand = Math.random().toString();
    const now = new Date();
    const verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex');

    const user = await this.userRepository.create({
      type: 'seller',
      username: data.username,
      email: request.email as string,
      instagramAuthToken: longLivedToken,
      instagramUsername: data.username,
      emailVerificationCode: verficationCodeString,
      passwordVerificationCode: verficationCodeString,
      instagramUserId: data.id,
      emailVerified: false,
      favorites: [],
      followers: [],
      following: [],
      addresses: [],
      cards: [],
      preferences: {
        sizes: [],
        colors: [],
        prices: []
      },
      seller: {
        verificationStatus: 'unverified',
        missingInfo: ['external_account'],
        errors: []
      },
      stripeCustomerId: stripeId
    });

    // TODO: remove this in production
    await this.sendGridService.sendEmail(user.email as string, `You're Approved To Sell On Relovely!`,
      `Click <a href="dev.relovely.com/account/verify?type=seller&code=${verficationCodeString}">here</a> to get started.`);
  }


  @post('/instagram/signup', {
    responses: {
      '204': {
        description: 'Success'
      },
    },
  })
  async signup(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(OAuthRequest),
        },
      },
    })
    request: OAuthRequest,
  ): Promise<void> {

    if (!request.email) {
      throw new HttpErrors.BadRequest('Email is required');
    }

    const existingEmail = (await this.userRepository.findOne({ where: { email: request.email } })) as UserWithRelations;

    if (existingEmail) {
      throw new HttpErrors.Conflict('That email is not available.');
    }

    let data: BasicData;
    try {
      data = await this.instagramService.getBasicUserData(request.code);
    }
    catch {
      throw new HttpErrors.BadRequest('Invalid account')
    }

    const longLivedToken = request.code
    const existingUser = (await this.userRepository.findOne({ where: { instagramUsername: data.username } })) as UserWithRelations;

    if (existingUser) {
      throw new HttpErrors.Conflict('That Instagram account is already linked to an existing user');
    }

    const stripeId = await this.stripeService.createCustomer(request.email as string);

    const rand = Math.random().toString();
    const now = new Date();
    const verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex');

    const user = await this.userRepository.create({
      type: 'member',
      username: data.username,
      email: request.email as string,
      instagramAuthToken: longLivedToken,
      instagramUsername: data.username,
      emailVerificationCode: verficationCodeString,
      instagramUserId: data.id,
      emailVerified: false,
      favorites: [],
      followers: [],
      following: [],
      addresses: [],
      cards: [],
      preferences: {
        sizes: [],
        colors: [],
        prices: []
      },
      stripeCustomerId: stripeId
    });

    // TODO: remove this in production
    await this.sendGridService.sendEmail(user.email as string, `Welcome to Relovely!`,
      `Click <a href="dev.relovely.com/account/verify?type=member&code=${verficationCodeString}">here</a> to get started.`);
  }

  @authenticate('jwt')
  @post('/instagram/link', {
    responses: {
      '204': {
        description: 'Success'
      },
    },
  })
  async link(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(InstagramTokenRequest),
        },
      },
    })
    request: InstagramTokenRequest,
  ): Promise<User> {

    let data: BasicData,
      longLivedToken: LongLivedTokenData;
    try {
      let authResponse: AuthData;
      authResponse = await this.instagramService.getAccessTokenLink(request.token);
      data = await this.instagramService.getBasicUserData(authResponse.access_token);
      longLivedToken = await this.instagramService.getlongLivedAccessToken(authResponse.access_token);
    }
    catch (error) {
      throw new HttpErrors.BadRequest('Invalid account.')
    }

    const existingUser = (await this.userRepository.findOne({ where: { instagramUsername: data.username } })) as UserWithRelations;

    if (existingUser && existingUser.id !== this.user.id) {
      throw new HttpErrors.Conflict('That Instagram account is already linked to an existing user');
    }

    const profile = this.user;
    await this.userRepository.updateById(this.user.id, {
      instagramAuthToken: longLivedToken.access_token,
      instagramUsername: data.username,
      username: data.username,
      usernameReset: false
    });

    return await this.userRepository.findById(this.user.id);
  }


  @post('/instagram/token', {
    responses: {
      '204': {
        description: 'Success'
      },
    },
  })
  async token(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(InstagramTokenRequest),
        },
      },
    })
    request: InstagramTokenRequest,
  ): Promise<InstagramTokenResponse> {

    let data: BasicData,
      longLivedToken: LongLivedTokenData;
    try {
      let authResponse: AuthData;
      if (request.type === 'member') {
        authResponse = await this.instagramService.getAccessTokenMember(request.token);
      } else {
        authResponse = await this.instagramService.getAccessTokenSeller(request.token);
      }
      data = await this.instagramService.getBasicUserData(authResponse.access_token);
      longLivedToken = await this.instagramService.getlongLivedAccessToken(authResponse.access_token);
    }
    catch (error) {
      throw new HttpErrors.BadRequest('Invalid account.')
    }
    const existingUser = (await this.userRepository.findOne({ where: { instagramUsername: data.username } })) as UserWithRelations;

    if (existingUser) {
      throw new HttpErrors.Conflict('That Instagram account is already linked to an existing user');
    }

    return { token: longLivedToken.access_token, username: data.username };

  }
}
