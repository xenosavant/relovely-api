import { post, getModelSchemaRef, requestBody, HttpErrors } from "@loopback/rest";
import { User, UserWithRelations } from "../../models";
import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { InstagramService, SendgridService } from "../../services";
import { service, inject } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService } from "@loopback/authentication";
import { AuthResponse } from '../../authentication/auth-response';
import { userDetailFields } from "../user/response/user-list.interface";
import { AppUserProfile } from "../../authentication/app-user-profile";
import { OAuthRequest } from "../../authentication/oauth-request";
import { AppCredentialService } from "../../services/authentication/credential.service";
import { StripeService } from '../../services/stripe/stripe.service';
import * as crypto from 'crypto'

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
    public sendGridService: SendgridService) { }

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

    const authResponse = await this.instagramService.getAccessToken(request.code);
    const data = await this.instagramService.getBasicUserData(authResponse.access_token);
    const profile = await this.instagramService.getUserProfile(data.username);
    const longLivedToken = await this.instagramService.getlongLivedAccessToken(authResponse.access_token)

    if (!data.email) {
      throw new HttpErrors.BadRequest('No email');
    }

    const existingUser = (await this.userRepository.findOne({ where: { instagramUsername: data.username } })) as UserWithRelations;

    if (existingUser) {
      if (existingUser.seller && existingUser.seller.approved) {
        throw new HttpErrors.Conflict('That account is already linked to an existing seller');
      } else {
        throw new HttpErrors.Conflict('The account linked to that Instagram is awaiting approval');
      }
    }

    const stripeId = await this.stripeService.createCustomer(data.email);

    const rand = Math.random().toString();
    const now = new Date();
    const verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex');

    const user = await this.userRepository.create({
      profileImageUrl: profile.graphql.user.profile_pic_url_hd,
      type: 'seller',
      username: data.username,
      email: data.email,
      signedInWithFacebook: false,
      instagramAuthToken: longLivedToken.access_token,
      instagramUsername: data.username,
      passwordVerificationCode: verficationCodeString,
      instagramUserId: profile.graphql.user.id,
      emailVerified: true,
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
        missingInfo: [],
        errors: [],
        approved: false
      },
      stripeCustomerId: stripeId
    });

    await this.sendGridService.sendEmail(user.email as string, `You're approved to sell!`, `Click <a href="dev.relovely.com/account/reset-password?code=${encodeURI(verficationCodeString)}">here</a> to reset your password.`);)
  }
}
