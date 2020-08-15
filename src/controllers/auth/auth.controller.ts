import { repository, DataObject } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { post, getModelSchemaRef, requestBody, HttpErrors } from "@loopback/rest";
import { AuthResponse } from "../../authentication/auth-response";
import { AuthRequest } from "./auth-request";
import { inject, service } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService, authenticate } from "@loopback/authentication";
import { AppCredentialService } from "../../services/authentication/credential.service";
import { AppUserProfile } from "../../authentication/app-user-profile";
import { SendgridService, InstagramService } from "../../services";
import * as crypto from 'crypto'
import { SignupResponse } from "./signup-response";
import { VerifyEmailRequest } from "./verify-email.request";
import { ResetPasswordRequest } from "./reset-password-request";
import { PasswordEmailRequest } from "./password-email-request";
import { StripeService } from '../../services/stripe/stripe.service';
import { User } from '../../models';
import { sleep } from '../../helpers/sleep';
import { MailChimpService } from '../../services/mailchimp/mailchimp.service';

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';


export class AuthController {
  constructor(
    @repository(UserRepository)
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
    public stripeService: StripeService,
    @service(MailChimpService)
    public mailChimpService: MailChimpService
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
    const stripeId = await this.stripeService.createCustomer((request.email as string).toLowerCase());
    const user = await this.userRepository.createUser(downcasedEmail, 'member', stripeId);
    await this.mailChimpService.addMember(downcasedEmail);
    await this.userRepository.addRemoveMailingList(user, true);

    const hash = await this.credentialService.hashPassword(request.password);

    await this.userRepository.updateById(user.id, { passwordHash: hash });

    await this.sendGridService.sendEmail(user.email,
      'Welcome To Relovely!',
      `Click <a href="${process.env.WEB_URL}/account/verify?type=member&code=${encodeURI(user.emailVerificationCode as string)}">here</a> to verify your email.`);
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

    if (!request.email) {
      throw new HttpErrors.Forbidden('Bad Request');
    }
    const downcasedEmail = request.email.toLowerCase();

    const user = await this.credentialService.verifyCredentials({ identifier: downcasedEmail, password: request.password });

    if (!user) {
      await sleep(2000);
      throw new HttpErrors.Forbidden('Incorrect username or password');
    }

    if (!user.emailVerified) {
      throw new HttpErrors.Forbidden('Please verify your email before logging in');
    }


    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), type: 'internal' });

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

    const updates: DataObject<User> = {};

    if (request.password) {
      const hash = await this.credentialService.hashPassword(request.password);
      updates.passwordHash = hash;
      updates.passwordVerificationCode = undefined;
    }

    updates.emailVerified = true;
    updates.emailVerificationCode = undefined;

    await this.userRepository.updateById(user.id, updates);

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), type: 'internal' });

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
    if (!request.identifier) {
      throw new HttpErrors.Forbidden();
    }
    const user = await this.userRepository.findOne({ where: { email: request.identifier.toLowerCase() } });

    if (!user) {
      await sleep(2000);
      throw new HttpErrors.Forbidden('That email does not exist in our system.');
    }

    const rand = Math.random().toString();
    const now = new Date();
    const verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex');

    await this.userRepository.updateById(user.id, { passwordVerificationCode: verficationCodeString });

    await this.sendGridService.sendEmail(user.email as string,
      'Relovely - Reset Password',
      `Click <a href="${process.env.WEB_URL}/account/reset-password?code=${encodeURI(verficationCodeString)}">here</a> to reset your password.`);
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

    await this.userRepository.updateById(user.id, {
      passwordHash: hash,
      passwordVerificationCode: undefined
    });

    const userProfile = {} as AppUserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), type: 'internal' });

    const jwt = await this.tokenService.generateToken(userProfile);

    return { user: user, jwt: jwt };
  }
}
