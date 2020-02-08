import { UserService } from "@loopback/authentication";
import { User } from "../../models";
import { Credentials } from "../authentication/credentials";
import { HttpErrors } from "@loopback/rest";
import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { PasswordHasher } from "../authentication/hash.bcrypt";
import { UserProfile } from "@loopback/security";

export class AppUserService implements UserService<User, Credentials> {
  constructor(
    @repository(UserRepository) public userRepository: UserRepository,
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
    return userProfile;
  }
}
