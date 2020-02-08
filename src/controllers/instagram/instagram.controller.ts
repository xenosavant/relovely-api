import { post, getModelSchemaRef, requestBody } from "@loopback/rest";
import { User } from "../../models";
import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { InstagramSignupRequest } from './request/instagram-signup-request.interface';
import { InstagramService } from "../../services";
import { service, inject } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService } from "@loopback/authentication";
import { InstagramSignupResponse } from './response/instagram-signup-response';
import { UserProfile } from "@loopback/security";

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';


export class InstagramController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @service(InstagramService)
    public instagramService: InstagramService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService) { }

  @post('/instagram/signup', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(InstagramSignupResponse)
          }
        },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(InstagramSignupRequest),
        },
      },
    })
    request: InstagramSignupRequest,
  ): Promise<InstagramSignupResponse> {

    const authResponse = await this.instagramService.getAccessToken(request.code);
    const data = await this.instagramService.getBasicUserData(authResponse.access_token);
    const profile = await this.instagramService.getUserProfile(data.username);
    const longLivedToken = await this.instagramService.getlongLivedAccessToken(authResponse.access_token)

    // TODO: check to make sure username is not taken

    const user = await this.userRepository.create({
      username: data.username,
      profileImageUrl: profile.graphql.user.profile_pic_url_hd,
      isSeller: false,
      signedInWithInstagram: true,
      signedInWithFacebook: false,
      instagramAuthToken: longLivedToken.access_token
    });

    const userProfile = {} as UserProfile;
    userProfile.id = (user.id as string).toString();
    userProfile.name = user.username;
    userProfile.type = 'instagram';

    const jwt = await this.tokenService.generateToken(userProfile);

    return { user: user, jwt: jwt };
  }
}
