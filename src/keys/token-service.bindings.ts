import { BindingKey } from "@loopback/core";
import { TokenService } from "@loopback/authentication";
import { PasswordHasher } from '../services/authentication/hash.bcrypt'

export namespace TokenServiceBindings {
  export const TOKEN_SECRET = BindingKey.create<string>(
    'token.secret',
  );

  export const TOKEN_EXPIRATION_TIME = BindingKey.create<string>(
    'token.expiration',
  );

  export const TOKEN_SERVICE = BindingKey.create<TokenService>(
    'services.TokenService',
  );

  export const HASH_SERVICE = BindingKey.create<PasswordHasher>(
    'services.PasswordHasher',
  );
}
