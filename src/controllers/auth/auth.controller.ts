import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { post, getModelSchemaRef, requestBody, HttpErrors } from "@loopback/rest";
import { InstagramSignupResponse } from "../instagram/response/instagram-signup-response";
import { AuthRequest } from "./auth-request";
import { inject, service } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { TokenService } from "@loopback/authentication";
import { AppCredentialService } from "../../services/authentication/credential.service";
import { UserProfile } from "@loopback/security";

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';


export class AuthController {
  constructor(@repository(UserRepository)
  public userRepository: UserRepository,
    @inject('services.AppCredentialService')
    public credentialService: AppCredentialService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService
  ) { }

  @post('/signup', {
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
  async signup(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(AuthRequest),
        },
      },
    })
    request: AuthRequest
  ): Promise<InstagramSignupResponse> {

    // TODO: check to make sure username is not taken

    const existing = await this.userRepository.findOne({ where: { email: request.email } });

    if (existing) {
      throw new HttpErrors.Conflict('Email already exists');
    }

    const hash = await this.credentialService.hashPassword(request.password);

    const user = await this.userRepository.create({
      email: request.email,
      isSeller: false,
      signedInWithInstagram: false,
      signedInWithFacebook: false,
      passwordHash: hash
    });

    const userProfile = {} as UserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), name: user.email, type: 'internal' });

    const jwt = await this.tokenService.generateToken(userProfile);

    return { user: user, jwt: jwt };

  }

  @post('/signin', {
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
  async signin(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(AuthRequest),
        },
      },
    })
    request: AuthRequest,
  ): Promise<InstagramSignupResponse> {

    // TODO: check to make sure username is not taken

    const user = await this.credentialService.verifyCredentials({ identifier: request.email, password: request.password });

    const userProfile = {} as UserProfile;
    Object.assign(userProfile, { id: (user.id as string).toString(), name: user.email, type: 'internal' });

    const jwt = await this.tokenService.generateToken(userProfile);

    return { user: user, jwt: jwt };
  }
}
