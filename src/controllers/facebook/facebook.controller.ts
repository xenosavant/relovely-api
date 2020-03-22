import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { service, inject } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService, authenticate } from "@loopback/authentication";
import { FacebookService } from "../../services/facebook/facebook.service";
import { post, getModelSchemaRef, requestBody, HttpErrors } from "@loopback/rest";
import { OAuthResponse } from "../../authentication/oauth-response";
import { AppUserProfile } from "../../authentication/app-user-profile";
import { OAuthRequest } from "../../authentication/oauth-request";
import { AppCredentialService } from "../../services/authentication/credential.service";
import { SecurityBindings } from '@loopback/security';
import { User } from "../../models";
import { CloudinaryService } from "../../services";
import * as fs from 'fs';

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
    public cloudinaryService: CloudinaryService) { }

  @post('/facebook/signup', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(OAuthResponse)
          }
        },
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
  ): Promise<OAuthResponse> {

    const authResponse = await this.facebookService.getAccessToken(request.code, 'signup');
    const longLivedToken = await this.facebookService.getlongLivedAccessToken(authResponse.access_token)
    const fbuser = await this.facebookService.getBasicUserData(longLivedToken.access_token);
    const picture = await this.facebookService.getProfilePicture(longLivedToken.access_token);
    const existingFacebookUser = await this.userRepository.findOne({ where: { facebookUserId: fbuser.id } });
    if (existingFacebookUser) {
      return { error: 'This facebook account is already linked with an existing user' };
    }
    const user = await this.userRepository.create({
      username: fbuser.name?.replace(' ', ''),
      type: 'member',
      signedInWithInstagram: false,
      signedInWithFacebook: true,
      facebookAuthToken: longLivedToken.access_token,
      facebookUserId: fbuser.id
    });

    const prefix = 'data:image/jpeg;base64,';
    let imageBuffer = Buffer.from(picture);
    let imageBase64 = imageBuffer.toString('base64');
    const cloudinaryResponse = await this.cloudinaryService.upload(prefix + imageBase64, user.id as string);

    user.profileImageUrl = cloudinaryResponse.url;
    this.userRepository.update(user);

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'facebook' });

    const jwt = await this.tokenService.generateToken(userProfile);
    return { user: user, jwt: jwt };
  }

  @post('/facebook/signin', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(OAuthResponse)
          }
        },
      },
    },
  })
  async signin(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(OAuthRequest),
        },
      },
    })
    request: OAuthRequest,
  ): Promise<OAuthResponse> {

    const authResponse = await this.facebookService.getAccessToken(request.code, 'signin');
    const longLivedToken = await this.facebookService.getlongLivedAccessToken(authResponse.access_token)
    const fbuser = await this.facebookService.getBasicUserData(longLivedToken.access_token);

    const user = await this.userRepository.findOne({ where: { facebookUserId: fbuser.id } });
    if (!user) {
      return { error: 'No user is linked to this facebook account. Please log in first and then link your facebook account' };
    }

    user.signedInWithFacebook = true;
    user.facebookAuthToken = longLivedToken.access_token;
    user.facebookUserId = fbuser.id;

    await this.userRepository.save(user);

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'facebook' });

    const jwt = await this.tokenService.generateToken(userProfile);
    return { user: user, jwt: jwt };
  }

  @post('/facebook/link', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(OAuthResponse)
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
  ): Promise<OAuthResponse> {

    const authResponse = await this.facebookService.getAccessToken(request.code, 'link');
    const longLivedToken = await this.facebookService.getlongLivedAccessToken(authResponse.access_token)
    const fbuser = await this.facebookService.getBasicUserData(longLivedToken.access_token);
    if (fbuser) {
      const profile = this.user;
      const user = await this.userRepository.findOne({ where: { username: profile.username } });
      if (!user) {
        throw new HttpErrors.Forbidden;
      }
      const existingFacebookUser = await this.userRepository.findOne({ where: { facebookUserId: fbuser.id } });
      if (existingFacebookUser && existingFacebookUser.id !== user.id) {
        return { error: 'This facebook account is already linked with an existing user' };
      }

      user.signedInWithFacebook = true;
      user.facebookAuthToken = longLivedToken.access_token;
      user.facebookUserId = fbuser.id;

      await this.userRepository.save(user);

      const userProfile = {} as AppUserProfile;
      Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'facebook' });

      const jwt = await this.tokenService.generateToken(userProfile);
      return { user: user, jwt: jwt };
    } else {
      throw new HttpErrors.Forbidden;
    }
  }
}


