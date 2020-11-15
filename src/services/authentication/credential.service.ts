import { UserService } from "@loopback/authentication";
import { User } from "../../models";
import { Credentials } from "./credentials";
import { HttpErrors } from "@loopback/rest";
import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { PasswordHasher, BcryptHasher } from "./hash.bcrypt";
import { PasswordManager } from '../user/password-manager';
import { inject } from "@loopback/core";
import { TokenServiceBindings } from "../../keys/token-service.bindings";
import { AppUserProfile } from "../../authentication/app-user-profile";
import { sleep } from '../../helpers/sleep';

export class AppCredentialService implements UserService<User, Credentials>, PasswordManager {
  constructor(
    @repository(UserRepository) public userRepository: UserRepository,
    @inject(TokenServiceBindings.HASH_SERVICE)
    public passwordHasher: PasswordHasher,
  ) { }

  async verifyCredentials(credentials: Credentials): Promise<User> {
    const foundUser = await this.userRepository.findOne({
      where: { email: credentials.identifier, active: true },
    });

    const message = 'Invalid login.'

    if (!foundUser) {
      await sleep(2000);
      throw new HttpErrors.Forbidden('Incorrect username or password');
    }

    if (!foundUser.passwordHash) {
      await sleep(2000);
      throw new HttpErrors.Forbidden('Incorrect username or password');
    }
    const valid = await this.verifyPassword(foundUser.passwordHash as string, credentials.password);
    if (!valid) {
      await sleep(2000);
      throw new HttpErrors.Forbidden('Incorrect username or password');
    }

    return foundUser;
  }

  async verifyUser(userId: string) {
    const foundUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    return foundUser;
  }

  convertToUserProfile(user: User): AppUserProfile {
    // since first name and lastName are optional, no error is thrown if not provided
    let userName = '';

    const userProfile = {} as AppUserProfile;
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
