import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { post, getModelSchemaRef, requestBody, HttpErrors } from "@loopback/rest";
import { AuthResponse } from "../../authentication/auth-response";
import { AuthRequest } from "./auth-request";
import { inject, service } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService } from "@loopback/authentication";
import { AppCredentialService } from "../../services/authentication/credential.service";
import { AppUserProfile } from "../../authentication/app-user-profile";
import { SendgridService, InstagramService } from "../../services";
import * as crypto from 'crypto'
import { SignupResponse } from "./signup-response";
import { VerifyEmailRequest } from "./verify-email.request";
import { ResetPasswordRequest } from "./reset-password-request";
import { PasswordEmailRequest } from "./password-email-request";
import { StripeService } from '../../services/stripe/stripe.service';

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
    @service(InstagramService)
    public instagramService: InstagramService,
    @service(StripeService)
    public stripeService: StripeService
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

    const instaUser = await this.instagramService.getUserProfile(request.username);
    if (instaUser) {
      throw new HttpErrors.Conflict('Username already exists on Instagram');
    }

    const hash = await this.credentialService.hashPassword(request.password);
    const rand = Math.random().toString();
    const now = new Date();
    const verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex');

    const stripeId = await this.stripeService.createCustomer(downcasedEmail);

    const user = await this.userRepository.create({
      username: request.username,
      email: downcasedEmail,
      type: 'member',
      signedInWithFacebook: false,
      passwordHash: hash,
      emailVerificationCode: verficationCodeString,
      emailVerified: false,
      favorites: [],
      followers: [],
      following: [],
      addresses: [],
      creditCards: [],
      stripeCustomerId: stripeId
    });

    await this.sendGridService.sendEmail(request.email,
      'Welcome To Relovely!',
      `Click <a href="dev.relovely.com/account/verify?type=email&code=${encodeURI(verficationCodeString)}">here</a> to verify your email.`);
  }

  @post('auth/signin', {
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
  async signin(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(AuthRequest),
        },
      },
    })
    request: AuthRequest,
  ): Promise<AuthResponse> {

    const downcasedEmail = request.email.toLowerCase();

    const user = await this.credentialService.verifyCredentials({ identifier: downcasedEmail, password: request.password });

    if (!user) {
      throw new HttpErrors.Forbidden('Invalid Credentials');
    }

    if (!user.emailVerified) {
      throw new HttpErrors.Forbidden('Please verify your email before logging in');
    }


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
            schema: getModelSchemaRef(AuthResponse)
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
  ): Promise<AuthResponse> {

    if (!request.code) {
      throw new HttpErrors.Forbidden();
    }

    const user = await this.userRepository.findOne({ where: { emailVerificationCode: request.code } });

    if (!user) {
      throw new HttpErrors.Forbidden();
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    this.userRepository.save(user);

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'internal' });

    const jwt = await this.tokenService.generateToken(userProfile);

    return { user: user, jwt: jwt };

  }

  @post('auth/password/email', {
    responses: {
      '204': {
        description: 'User model instance'
      },
    },
  })
  async emailPassword(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(PasswordEmailRequest),
        },
      },
    })
    request: PasswordEmailRequest,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email: request.identifier } });

    if (!user) {
      throw new HttpErrors.Forbidden();
    }

    const rand = Math.random().toString();
    const now = new Date();
    const verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex');

    user.passwordVerificationCode = verficationCodeString;
    await this.userRepository.save(user);

    await this.sendGridService.sendEmail(user.email as string,
      'Relovely - Reset Password',
      `Click <a href="dev.relovely.com/account/reset-password?code=${encodeURI(verficationCodeString)}">here</a> to reset your password.`);
  }

  @post('auth/password/reset', {
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
  async resetPassword(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(ResetPasswordRequest),
        },
      },
    })
    request: ResetPasswordRequest,
  ): Promise<AuthResponse> {

    if (!request.code) {
      throw new HttpErrors.Forbidden();
    }

    const user = await this.userRepository.findOne({ where: { passwordVerificationCode: request.code } });

    if (!user) {
      throw new HttpErrors.Forbidden();
    }

    const hash = await this.credentialService.hashPassword(request.password);

    user.passwordHash = hash;
    user.passwordVerificationCode = undefined;
    await this.userRepository.save(user);

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), username: user.username, type: 'internal' });

    const jwt = await this.tokenService.generateToken(userProfile);

    return { user: user, jwt: jwt };
  }
}
