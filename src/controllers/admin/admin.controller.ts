import { repository } from '@loopback/repository';
import { UserRepository, PromoRepository } from '../../repositories';
import { inject, service } from '@loopback/core';
import { AppCredentialService } from '../../services/authentication/credential.service';
import { TokenServiceBindings } from '../../keys/token-service.bindings';
import { TokenService, authenticate } from '@loopback/authentication';
import { SendgridService, InstagramService } from '../../services';
import { StripeService } from '../../services/stripe/stripe.service';
import { post, requestBody, getModelSchemaRef, HttpErrors, get, param } from '@loopback/rest';
import { SellerApplicationRequest } from '../user/request/seller-application.request';
import { SecurityBindings } from '@loopback/security';
import { AppUserProfile } from '../../authentication/app-user-profile';
import * as crypto from 'crypto'
import { ApproveSellerRequest } from '../user/request/approve-seller.request';
import { User } from '../../models';
import { userListFields } from '../user/response/user-list.interface';
import { MailChimpService } from '../../services/mailchimp/mailchimp.service';
import { Promo } from '../../models/promo.model';

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
    public stripeService: StripeService,
    @service(MailChimpService)
    public mailChimpService: MailChimpService,
    @repository(PromoRepository)
    public promoRepository: PromoRepository,
  ) { }


  @authenticate('jwt')
  @post('/admin/create-seller')
  async createSeller(
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

    const stripeId = await this.stripeService.createCustomer(downcasedEmail);

    await this.userRepository.createUser(downcasedEmail, 'seller', stripeId, request.instagramUsername, request.firstName, request.lastName, {
      missingInfo: ['external_account'],
      errors: [],
      freeSales: 3,
      verificationStatus: 'unverified',
      address: { ...request.address, name: request.firstName + request.lastName } as any
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
      await this.mailChimpService.addSeller(user.email);
      await this.userRepository.addRemoveMailingList(user, true);
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

      await this.userRepository.updateById(user.id,
        {
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
          'seller.approved': false,
          'seller.featured': false
        } as any);
    }
  }


  @authenticate('jwt')
  @get('/admin/sellers')
  async sellers(
    @param.query.string('unapproved') unapproved?: string,
  ): Promise<User[]> {
    const currentUser = await this.userRepository.findById(this.user.id, { fields: { admin: true } });
    if (!currentUser || !currentUser.admin) {
      throw new HttpErrors.Forbidden();
    }
    const where: any = { type: 'seller' };
    if (unapproved === 'true') {
      where.or = [
        { 'seller.approved': { exists: false } },
        { 'seller.approved': false, active: true }
      ]
    }
    return await this.userRepository.find({
      where: where
    });
  }

  @authenticate('jwt')
  @get('/admin/members')
  async members(
  ): Promise<User[]> {
    const currentUser = await this.userRepository.findById(this.user.id, { fields: { admin: true } });
    if (!currentUser || !currentUser.admin) {
      throw new HttpErrors.Forbidden();
    }
    const where: any = { type: 'member' };
    return await this.userRepository.find({
      where: where
    });
  }

  @authenticate('jwt')
  @get('/admin/promos')
  async promos(
  ): Promise<Promo[]> {
    const currentUser = await this.userRepository.findById(this.user.id, { fields: { admin: true } });
    if (!currentUser || !currentUser.admin) {
      throw new HttpErrors.Forbidden();
    }
    return await this.promoRepository.find({ where: {}, include: [{ relation: 'seller', scope: { fields: userListFields } }] });
  }

  @authenticate('jwt')
  @post('/admin/create-promo')
  async createPromo(
    @requestBody()
    promo: any
  ): Promise<void> {
    await this.promoRepository.create(promo);
  }

}
