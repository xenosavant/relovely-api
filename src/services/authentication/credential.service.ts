import { UserService } from "@loopback/authentication";
import { User } from "../../models";
import { Credentials } from "./credentials";
import { HttpErrors } from "@loopback/rest";
import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { PasswordHasher, BcryptHasher } from "./hash.bcrypt";
import { UserProfile } from "@loopback/security";
import { PasswordManager } from '../user/password-manager';
import { inject } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";

export class AppCredentialService implements UserService<User, Credentials>, PasswordManager {
  constructor(
    @repository(UserRepository) public userRepository: UserRepository,
    @inject(TokenServiceBindings.HASH_SERVICE)
    public passwordHasher: PasswordHasher,
  ) { }

  async verifyCredentials(credentials: Credentials): Promise<User> {
    const foundUser = await this.userRepository.findOne({
      where: { id: credentials.id },
    });

    if (!foundUser) {
      throw new HttpErrors.NotFound(
        `User with id ${credentials.id} not found.`,
      );
    }

    return foundUser;
  }

  convertToUserProfile(user: User): UserProfile {
    // since first name and lastName are optional, no error is thrown if not provided
    let userName = '';

    const userProfile = {} as UserProfile;
    userProfile['id'] = user.id;
    userProfile['name'] = userName;
    userProfile['type'] = 'internal';
    return userProfile;
  }

  public async hashPassword(password: string): Promise<string> {
    return this.passwordHasher.hashPassword(password);
  }

  public async verifyPassword(hash: string, password: string): Promise<boolean> {
    return this.passwordHasher.comparePassword(password, hash)
  }
}
