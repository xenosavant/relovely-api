import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { service, inject } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService, authenticate } from "@loopback/authentication";
import { FacebookService } from "../../services/facebook/facebook.service";
import { post, getModelSchemaRef, requestBody, HttpErrors } from "@loopback/rest";
import { AuthResponse } from "../../authentication/auth-response";
import { AppUserProfile } from "../../authentication/app-user-profile";
import { OAuthRequest } from "../../authentication/oauth-request";
import { AppCredentialService } from "../../services/authentication/credential.service";
import { SecurityBindings } from '@loopback/security';
import { User, UserWithRelations } from "../../models";
import { CloudinaryService } from "../../services";
import * as fs from 'fs';
import { StripeService } from '../../services/stripe/stripe.service';
import { userDetailFields } from '../user/response/user-list.interface';

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';


export class FacebookController {
  constructor(@repository(UserRepository)
  public userRepository: UserRepository,
    @service(FacebookService)
    public facebookService: FacebookService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
    @inject('services.AppCredentialService')
    public credentialService: AppCredentialService,
    @inject(SecurityBindings.USER, { optional: true }) private user: AppUserProfile,
    @service(CloudinaryService)
    public cloudinaryService: CloudinaryService,
    @service(StripeService)
    public stripeService: StripeService) { }

  @post('/facebook/continue', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(AuthResponse)
          }
        },
      },
    },
  })
  async continue(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(OAuthRequest),
        },
      },
    })
    request: OAuthRequest,
  ): Promise<AuthResponse> {

    const authResponse = await this.facebookService.getAccessToken(request.code, 'signup');
    const longLivedToken = await this.facebookService.getlongLivedAccessToken(authResponse.access_token)
    const fbuser = await this.facebookService.getBasicUserData(longLivedToken.access_token);
    const picture = await this.facebookService.getProfilePicture(longLivedToken.access_token);
    const existingFacebookUser = await this.userRepository.findOne({ where: { facebookUserId: fbuser.id } });

    let existing = false;
    let user: UserWithRelations;
    if (existingFacebookUser) {
      await this.userRepository.updateById(existingFacebookUser.id, { facebookAuthToken: longLivedToken.access_token });
      user = existingFacebookUser;
      existing = true;
    } else {
      const existingEmail = (await this.userRepository.findOne({ where: { email: fbuser.email } })) as UserWithRelations;

      if (existingEmail) {
        throw new HttpErrors.Conflict('The email asociated with that account is not available.');
      }

      const stripeId = await this.stripeService.createCustomer(fbuser.email as string);

      user = await this.userRepository.create({
        username: fbuser.name?.replace(' ', ''),
        stripeCustomerId: stripeId,
        email: fbuser.email,
        type: 'member',
        facebookAuthToken: longLivedToken.access_token,
        facebookUserId: fbuser.id,
        favorites: [],
        following: [],
        addresses: [],
        cards: []
      });
      const prefix = 'data:image/jpeg;base64,';
      let imageBuffer = Buffer.from(picture);
      let imageBase64 = imageBuffer.toString('base64');
      const cloudinaryResponse = await this.cloudinaryService.upload(prefix + imageBase64, user.id as string);
      this.userRepository.updateById(user.id, { profileImageUrl: cloudinaryResponse.url });
    }

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'facebook' });

    const jwt = await this.tokenService.generateToken(userProfile);
    return { user: user, jwt: jwt, existing: existing };
  }

  // @post('/facebook/signin', {
  //   responses: {
  //     '200': {
  //       description: 'User model instance',
  //       content: {
  //         'application/json': {
  //           schema: getModelSchemaRef(AuthResponse)
  //         }
  //       },
  //     },
  //   },
  // })
  // async signin(
  //   @requestBody({
  //     content: {
  //       'application/json': {
  //         schema: getModelSchemaRef(OAuthRequest),
  //       },
  //     },
  //   })
  //   request: OAuthRequest,
  // ): Promise<AuthResponse> {

  //   const authResponse = await this.facebookService.getAccessToken(request.code, 'signin');
  //   const longLivedToken = await this.facebookService.getlongLivedAccessToken(authResponse.access_token);
  //   const fbuser = await this.facebookService.getBasicUserData(longLivedToken.access_token);
  //   const user = await this.userRepository.findOne({ where: { facebookUserId: fbuser.id } });
  //   if (!user) {
  //     throw new HttpErrors.BadRequest('No user is linked to this facebook account. Please log in first and then link your facebook account');
  //   }

  //   await this.userRepository.updateById(user.id, {
  //     facebookAuthToken: longLivedToken.access_token,
  //     facebookUserId: fbuser.id
  //   });

  //   const userProfile = {} as AppUserProfile;
  //   Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'facebook' });

  //   const jwt = await this.tokenService.generateToken(userProfile);
  //   return { user: user, jwt: jwt };
  // }

  @post('/facebook/link', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(AuthResponse)
          }
        },
      },
    },
  })
  @authenticate('jwt')
  async link(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(OAuthRequest),
        },
      },
    })
    request: OAuthRequest,
  ): Promise<User> {

    const authResponse = await this.facebookService.getAccessToken(request.code, 'link');
    const longLivedToken = await this.facebookService.getlongLivedAccessToken(authResponse.access_token)
    const fbuser = await this.facebookService.getBasicUserData(longLivedToken.access_token);
    if (fbuser) {
      const profile = this.user;
      const user = await this.userRepository.findById(profile.id);
      if (!user) {
        throw new HttpErrors.Forbidden;
      }
      const existingFacebookUser = await this.userRepository.findOne({ where: { facebookUserId: fbuser.id } });
      if (existingFacebookUser && existingFacebookUser.id !== user.id) {
        throw new HttpErrors.Conflict('This facebook account is already linked with an existing user');
      }

      user.facebookAuthToken = longLivedToken.access_token;
      user.facebookUserId = fbuser.id;


      return this.userRepository.findById(user.id, { fields: userDetailFields });
    } else {
      throw new HttpErrors.Forbidden;
    }
  }
}


