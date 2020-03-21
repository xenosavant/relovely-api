import { inject } from '@loopback/context';
import { HttpErrors } from '@loopback/rest';
import { promisify } from 'util';
import { TokenService } from '@loopback/authentication';
import { TokenServiceBindings } from '../../keys/token-service.bindings'
import { repository } from '@loopback/repository';
import { UserRepository } from '../../repositories';
import { User } from '../../models';
import { service } from '@loopback/core';
import { InstagramService } from '..';
import { AppUserProfile } from '../../authentication/app-user-profile';

const jwt = require('jsonwebtoken');
const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

export class JWTService implements TokenService {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SECRET)
    private jwtSecret: string,
    @inject(TokenServiceBindings.TOKEN_EXPIRATION_TIME)
    private jwtExpiresIn: string
  ) { }

  async verifyToken(token: string): Promise<AppUserProfile> {
    if (!token) {
      throw new HttpErrors.Unauthorized(
        `Error verifying token: 'token' is null`,
      );
    }

    const userProfile = {} as AppUserProfile;

    try {
      // decode user profile from token
      const decryptedToken = await verifyAsync(token, this.jwtSecret);

      // don't copy over  token field 'iat' and 'exp', nor 'email' to user profile
      userProfile['id'] = decryptedToken.id;
      userProfile['name'] = decryptedToken.name;
      userProfile['type'] = decryptedToken.type;
    } catch (error) {
      throw new HttpErrors.Unauthorized(
        `Error verifying token: ${error.message}`,
      );
    }

    return userProfile;
  }

  async generateToken(userProfile: AppUserProfile): Promise<string> {
    if (!userProfile) {
      throw new HttpErrors.Unauthorized(
        'Error generating token: userProfile is null',
      );
    }

    // Generate a JSON Web Token
    let token: string;
    try {
      token = await signAsync(userProfile, this.jwtSecret, {
        expiresIn: Number(this.jwtExpiresIn),
      });
    } catch (error) {
      throw new HttpErrors.Unauthorized(`Error encoding token: ${error}`);
    }

    return token;
  }
}
