import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { post, getModelSchemaRef, requestBody, HttpErrors } from "@loopback/rest";
import { OAuthResponse } from "../../authentication/oauth-response";
import { AuthRequest } from "./auth-request";
import { inject, service } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService } from "@loopback/authentication";
import { AppCredentialService } from "../../services/authentication/credential.service";
import { AppUserProfile } from "../../authentication/app-user-profile";
import { SendgridService } from "../../services";
import * as crypto from 'crypto'
import { SignupResponse } from "./signup-response";
import { VerifyEmailRequest } from "./verify-email.request";

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';


export class AuthController {
  constructor(@repository(UserRepository)
  public userRepository: UserRepository,
    @inject('services.AppCredentialService')
    public credentialService: AppCredentialService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
    @service(SendgridService)
    public sendGridService: SendgridService,
  ) { }

  @post('auth/signup', {
    responses: {
      '204': {
        description: 'User model instance'
      },
    },
  })
  async signup(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(AuthRequest),
        },
      },
    })
    request: AuthRequest
  ): Promise<void> {

    const downcasedEmail = request.email.toLowerCase();

    const existingEmail = await this.userRepository.findOne({ where: { email: downcasedEmail } });

    if (existingEmail) {
      throw new HttpErrors.Conflict('Email already exists');
    }

    const existingUsername = await this.userRepository.findOne({ where: { username: request.username } });

    if (existingUsername) {
      throw new HttpErrors.Conflict('Username already exists');
    }

    const hash = await this.credentialService.hashPassword(request.password);
    const verificationCode = crypto.createHash('sha256'),
      verficationCodeString = verificationCode.digest('base64');

    const user = await this.userRepository.create({
      username: request.username,
      email: downcasedEmail,
      type: 'member',
      signedInWithInstagram: false,
      signedInWithFacebook: false,
      passwordHash: hash,
      emailVerificationCode: verficationCodeString,
      emailVerified: false
    });

    await this.sendGridService.sendEmail(request.email,
      'Welcome To Relovely!',
      'Welcome to relovely!',
      `Click <a href="https://192.34.56.220/account/verify?type=email&code=${encodeURI(verficationCodeString)}">here</a> to verify your email.`);

  }

  @post('auth/signin', {
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
          schema: getModelSchemaRef(AuthRequest),
        },
      },
    })
    request: AuthRequest,
  ): Promise<OAuthResponse> {

    const downcasedEmail = request.email.toLowerCase();

    const user = await this.credentialService.verifyCredentials({ identifier: downcasedEmail, password: request.password });

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'internal' });

    const jwt = await this.tokenService.generateToken(userProfile);

    return { user: user, jwt: jwt };
  }


  @post('auth/verify', {
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
  async verify(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(VerifyEmailRequest),
        },
      },
    })
    request: VerifyEmailRequest,
  ): Promise<OAuthResponse> {

    const user = await this.userRepository.findOne({ where: { emailVerificationCode: request.code } });

    if (!user) {
      throw new HttpErrors.Forbidden();
    }

    if (user.emailVerificationCode !== request.code) {
      throw new HttpErrors.Forbidden();
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    this.userRepository.update(user);

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'internal' });

    const jwt = await this.tokenService.generateToken(userProfile);

    return { user: user, jwt: jwt };

  }
}
