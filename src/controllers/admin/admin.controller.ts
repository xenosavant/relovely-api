import { repository } from '@loopback/repository';
import { UserRepository } from '../../repositories';
import { inject, service } from '@loopback/core';
import { AppCredentialService } from '../../services/authentication/credential.service';
import { TokenServiceBindings } from '../../keys/token-service.bindings';
import { TokenService } from '@loopback/authentication';
import { SendgridService, InstagramService } from '../../services';
import { StripeService } from '../../services/stripe/stripe.service';

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
    public stripeService: StripeService
  ) { }



}
