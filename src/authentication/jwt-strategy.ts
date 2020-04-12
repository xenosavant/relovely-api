import { inject } from '@loopback/context';
import { HttpErrors, Request } from '@loopback/rest';
import { AuthenticationStrategy, TokenService } from '@loopback/authentication';

import { TokenServiceBindings } from '../keys/token-service.bindings';
import { repository } from '@loopback/repository';
import { service } from '@loopback/core';
import { UserRepository } from '../repositories';
import { InstagramService } from '../services';
import { User } from '../models';
import { AppCredentialService } from '../services/authentication/credential.service';
import { AppUserProfile } from '../authentication/app-user-profile';

export class JWTAuthenticationStrategy implements AuthenticationStrategy {
  name: string = 'jwt';

  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @service(InstagramService)
    public instagramService: InstagramService,
    @inject('services.AppCredentialService')
    public credentialService: AppCredentialService,
  ) { }

  async authenticate(request: Request): Promise<AppUserProfile | undefined> {
    const token: string = this.extractCredentials(request);
    const userProfile: AppUserProfile = await this.tokenService.verifyToken(token);
    this.credentialService.verifyUser(userProfile.id as string);
    return userProfile;
  }

  extractCredentials(request: Request): string {
    if (!request.headers.authorization) {
      throw new HttpErrors.Unauthorized(`Authorization header not found.`);
    }

    // for example: Bearer xxx.yyy.zzz
    const authHeaderValue = request.headers.authorization;

    if (!authHeaderValue.startsWith('Bearer')) {
      throw new HttpErrors.Unauthorized(
        `Authorization header is not of type 'Bearer'.`,
      );
    }

    //split the string into 2 parts: 'Bearer ' and the `xxx.yyy.zzz`
    const parts = authHeaderValue.split(' ');
    if (parts.length !== 2)
      throw new HttpErrors.Unauthorized(
        `Authorization header value has too many parts. It must follow the pattern: 'Bearer xx.yy.zz' where xx.yy.zz is a valid JWT token.`,
      );
    const token = parts[1];

    return token;
  }
}
