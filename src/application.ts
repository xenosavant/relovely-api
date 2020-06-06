import { BootMixin } from '@loopback/boot';
import { ApplicationConfig } from '@loopback/core';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import { RepositoryMixin } from '@loopback/repository';
import { RestApplication, RestBindings } from '@loopback/rest';
import { ServiceMixin } from '@loopback/service-proxy';
import path from 'path';
import { Sequence } from './sequence';
import { DbDataSource } from './datasources/db.datasource';
import { runInThisContext } from 'vm';
import { UserRepository } from './repositories';
import { AuthenticationComponent, registerAuthenticationStrategy } from '@loopback/authentication';
import { TokenServiceBindings } from './keys/token-service.bindings'
import { TokenService } from "@loopback/authentication";
import { JWTService } from './services/authentication/jwt.service';
import { BcryptHasher } from './services/authentication/hash.bcrypt';
import { AppCredentialService } from './services/authentication/credential.service';
import { JWTAuthenticationStrategy } from './authentication/jwt-strategy';

export class RelovelyApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(Sequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.bind(RestExplorerBindings.CONFIG).to({
      path: '/explorer',
    });

    // if (process.env.NODE_ENV !== 'production') {
    this.bind(RestBindings.ERROR_WRITER_OPTIONS).to({ debug: true });
    require('dotenv').config();
    // }

    registerAuthenticationStrategy(this as any, JWTAuthenticationStrategy);

    this.dataSource(new DbDataSource());

    this.repository(UserRepository);

    this.component(RestExplorerComponent);
    this.component(AuthenticationComponent);

    this.bind(TokenServiceBindings.TOKEN_SECRET).to(
      process.env.JWT_SECRET as string,
    );

    this.bind(TokenServiceBindings.TOKEN_EXPIRATION_TIME).to(
      process.env.JWT_EXPIRATION as string,
    );

    this.bind(TokenServiceBindings.TOKEN_SERVICE).toClass(JWTService);
    this.bind(TokenServiceBindings.HASH_SERVICE).toClass(BcryptHasher);


    // Services

    this.bind('services.AppCredentialService').toClass(AppCredentialService);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }
}
