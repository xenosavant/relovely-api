import { repository } from '@loopback/repository';
import { UserRepository } from '../../repositories';
import { inject, service } from '@loopback/core';
import { AppCredentialService } from '../../services/authentication/credential.service';
import { TokenServiceBindings } from '../../keys/token-service.bindings';
import { TokenService, authenticate } from '@loopback/authentication';
import { SendgridService, InstagramService } from '../../services';
import { StripeService } from '../../services/stripe/stripe.service';
import { post, requestBody, getModelSchemaRef, HttpErrors, get } from '@loopback/rest';
import { SellerApplicationRequest } from '../user/request/seller-application.request';
import { SecurityBindings } from '@loopback/security';
import { AppUserProfile } from '../../authentication/app-user-profile';
import * as crypto from 'crypto'
import { ApproveSellerRequest } from '../user/request/approve-seller.request';
import { User } from '../../models';
import { userListFields } from '../user/response/user-list.interface';

export class AdminController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject('services.AppCredentialService')
    public credentialService: AppCredentialService,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile,
    @service(SendgridService)
    public sendGridService: SendgridService,
    @service(InstagramService)
    public instagramService: InstagramService,
    @service(StripeService)
    public stripeService: StripeService
  ) { }


  @authenticate('jwt')
  @post('/admin/create-seller')
  async create(
    @requestBody()
    request: SellerApplicationRequest
  ): Promise<void> {
    const currentUser = await this.userRepository.findById(this.user.id, { fields: { admin: true } });
    if (!currentUser || !currentUser.admin) {
      throw new HttpErrors.Forbidden();
    }
    const existingEmail = await this.userRepository.findOne({ where: { email: request.email } });
    const downcasedEmail = request.email.toLowerCase();
    if (existingEmail) {
      throw new HttpErrors.Conflict('Email already exists');
    }

    const rand = Math.random().toString();
    const now = new Date();
    const verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex');

    await this.userRepository.create({
      active: true,
      firstName: request.firstName,
      lastName: request.lastName,
      email: downcasedEmail,
      type: 'seller',
      emailVerified: false,
      instagramUsername: request.instagramUsername,
      username: request.instagramUsername,
      emailVerificationCode: verficationCodeString,
      favorites: [],
      followers: [],
      following: [],
      addresses: [],
      cards: [],
      preferences: {
        sizes: [],
        colors: [],
        prices: []
      },
      seller: {
        missingInfo: ['external_account'],
        errors: [],
        approved: false,
        freeSales: 3,
        verificationStatus: 'unverified',
        address: { ...request.address, name: request.firstName + request.lastName }
      }
    });
  }

  @authenticate('jwt')
  @post('/admin/approve-seller')
  async approve(
    @requestBody()
    request: ApproveSellerRequest,
  ): Promise<void> {

    const currentUser = await this.userRepository.findById(this.user.id, { fields: { admin: true } });
    if (!currentUser || !currentUser.admin) {
      throw new HttpErrors.Forbidden();
    }
    const user = await this.userRepository.findOne({ where: { email: request.email } });
    if (!user || !user.seller) {
      throw new HttpErrors.NotFound('Not Found');
    }

    if (request.approved) {
      if (/@/.test(user.instagramUsername as string)) {
        user.instagramUsername = user.instagramUsername?.replace(/@/, '');
      }

      const existingUsers = await this.userRepository.find({ where: { username: user.instagramUsername, email: { neq: user.email } } });

      existingUsers.forEach(u => {
        this.userRepository.updateById(u.id, {
          username: undefined,
          usernameReset: true
        });
      });

      const stripeId = await this.stripeService.createCustomer(user.email);

      await this.userRepository.updateById(user.id,
        {
          stripeCustomerId: stripeId,
          active: request.approved,
          username: user.instagramUsername,
          instagramUsername: user.instagramUsername,
          'seller.approved': request.approved,
          'seller.featured': request.featured
        } as any);
      await this.sendGridService.sendEmail(request.email as string, `You're Approved To Sell On Relovely!`,
        `Click <a href="${process.env.WEB_URL}/account/verify?type=seller&code=${user.emailVerificationCode}">here</a> to get started.`);
    } else {
      await this.userRepository.updateById(user.id,
        {
          active: false,
          'seller.approved': false,
          'seller.featured': false
        } as any);
    }
  }


  @authenticate('jwt')
  @get('/admin/sellers')
  async favorites(
  ): Promise<User[]> {
    const currentUser = await this.userRepository.findById(this.user.id, { fields: { admin: true } });
    if (!currentUser || !currentUser.admin) {
      throw new HttpErrors.Forbidden();
    }
    return await this.userRepository.find({
      where: { type: 'seller', 'seller.approved': false, active: true } as any
    });
  }

}
