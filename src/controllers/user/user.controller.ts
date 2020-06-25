import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getModelSchemaRef,
  getWhereSchemaFor,
  patch,
  put,
  del,
  Request,
  Response,
  requestBody,
  HttpErrors,
  RestBindings
} from '@loopback/rest';
import { User, UserWithRelations, Product, Order } from '../../models';
import { UserRepository, ProductRepository, OrderRepository } from '../../repositories';
import { UserList, userListFields, userAuthFields } from './response/user-list.interface';
import { UserDetail } from './response/user-detail.interface';
import { Dictionary } from 'express-serve-static-core';
import { authenticate } from '@loopback/authentication';
import { userDetailFields } from "../user/response/user-list.interface";
import { productDetailFields } from '../product/response/product-detail.interface';
import { UserPreferences } from '../../models/user-preferences.model';
import { inject, service } from '@loopback/core';
import { SecurityBindings } from '@loopback/security';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { userUpdateFields } from './user-update-fields';
import { InstagramService, SendgridService } from '../../services';
import { SellerAccountRequest } from './request/seller-account-request.interface';
import { StripeService } from '../../services/stripe/stripe.service';
import { BankAccountRequest } from './request/bank-account.request.interface';
import { FILE_UPLOAD_SERVICE, FileUploadHandler } from '../../keys/upload-service.bindings';
import Stripe from 'stripe';
import { response } from '@loopback/openapi-v3/dist/decorators/response.decorator';
import { SellerDetails } from '../../models/seller-details';
import { Card } from '../../models/card.model';
import { Review } from '../../models/review.model';
import { UserReviewsResponse } from './response/user-reviews-response';
import { SellerApplicationRequest } from './request/seller-application.request';
import * as crypto from 'crypto';
import { productListFields } from '../product/response/product-list.interface';
import { httpsGetAsync } from '@loopback/testlab';
import { SupportRequest } from './request/support.request';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(ProductRepository)
    public productsRepository: ProductRepository,
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile,
    @service(InstagramService)
    public instagramService: InstagramService,
    @service(StripeService)
    public stripeService: StripeService,
    @inject(RestBindings.Http.REQUEST)
    private request: any,
    @inject(FILE_UPLOAD_SERVICE)
    private handler: FileUploadHandler,
    @service(SendgridService)
    public sendGridService: SendgridService
  ) { }

  @authenticate('jwt')
  @get('/users/me', {
    responses: {
      '200': {
        description: 'Array of User model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(User, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(User)) filter?: Filter<User>,
  ): Promise<User> {
    let user;
    try {
      user = await this.userRepository.findById(this.user.id as string, { fields: userAuthFields });
      if (user.type === 'seller') {
        const unshippedSales = await this.orderRepository.find({ where: { labelPrinted: { exists: false }, status: 'purchased' }, fields: { id: true } });
        if (unshippedSales.length !== 0) {
          user.sales = unshippedSales;
        }
      }
      return user;
    } catch {
      throw new HttpErrors.Unauthorized;
    }
  }

  @get('/users/{id}', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(User, { includeRelations: true }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string
  ): Promise<UserDetail> {

    if (!id) {
      throw new HttpErrors.BadRequest();
    }

    let user: UserWithRelations | null = null;
    const include = [{ relation: 'products', scope: { fields: productDetailFields } }, { relation: 'reviews' }];
    if (/^[a-f\d]{24}$/i.test(id)) {
      user = await this.userRepository.findById(id,
        {
          fields: userDetailFields,
          include: include
        });
    }

    if (!user) {
      user = await this.userRepository.findOne({ where: { username: id }, fields: userDetailFields, include: include });
    }

    if (!user) {
      throw new HttpErrors.NotFound();
    }
    const promiseDictionary: Record<string, any> = {};
    const response = user as any;
    const promises: Promise<any>[] = []
    if (user.type === 'seller') {
      promises.push(
        this.userRepository.find({
          where: { id: { inq: user.followers || [] } },
          fields: userListFields
        }).then(result => {
          promiseDictionary['followers'] = result;
        }));
      let rating = 0;
      if (user.reviews) {
        rating = (user.reviews.map(val => val.rating).reduce((prev, next) => {
          return prev + next;
        }) / user.reviews.length);
      }
      response.averageRating = rating;
      response.products = response.products ? response.products.filter((p: any) => p.active) : [];

      response.listings = response.products ? response.products.filter((p: Product) => !p.sold) : [];
      response.sales = response.products ? response.products.filter((p: Product) => p.sold) : [];
      response.city = (response.seller && response.seller.address) ? response.seller.address.city : null;
      response.state = (response.seller && response.seller.address) ? response.seller.address.state : null;
      delete response.products;
    }
    promises.push(
      this.productsRepository.find({
        where: { id: { inq: user.favorites || [] } },
        fields: productListFields,
        include: [{ relation: 'seller', scope: { fields: userListFields } }]
      }).then(result => {
        promiseDictionary['favorites'] = result;
      }),
      this.userRepository.find({
        where: { id: { inq: user.following || [] } },
        fields: userListFields
      }).then(result => {
        promiseDictionary['following'] = result;
      }));

    await Promise.all(promises);

    for (const key in promiseDictionary) {
      response[key] = promiseDictionary[key];
    }

    const detailResponse = { ...response } as UserDetail;
    return detailResponse;
  }

  @get('/users/featured', {
    responses: {
      '200': {
        description: 'User model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(User, { includeRelations: true }),
          },
        },
      },
    },
  })
  async featured(): Promise<UserDetail[]> {
    let users = await this.userRepository.find({ where: { 'seller.featured': true } as any, fields: userListFields });
    return users.map(u => {
      return {
        username: u.username as string,
        profileImageUrl: u.profileImageUrl as string,
        type: u.type
      }
    });
  }

  @authenticate('jwt')
  @patch('/users/{id}', {
    responses: {
      '200': {
        description: 'successful update',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, { partial: true }),
        },
      },
    })
    updates: Partial<User>,
  ): Promise<User> {
    if (this.user.id !== id) {
      throw new HttpErrors.Forbidden();
    }
    const user = await this.userRepository.findById(this.user.id, { fields: { username: true } })
    const keys = Object.keys(updates);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!userUpdateFields.includes(key)) {
        throw new HttpErrors.Forbidden();
      }
      if (key === 'username') {
        const username = updates['username'] as string;
        if (updates['username'] !== user.username) {
          const existingUsername = await this.userRepository.findOne({ where: { username: username } });
          if (existingUsername) {
            throw new HttpErrors.Conflict('Username already exists.');
          }
          if (!/^[0-9A-Za-z._]*$/g.test(username)) {
            throw new HttpErrors.Conflict('Invalid username, must contain only letters, numbers, periods, and undescores.');
          }
          if (username.length > 30) {
            throw new HttpErrors.Conflict('Invalid username, must be 30 characters or less');
          }
        }
        updates['usernameReset'] = false;
      }
    }
    await this.userRepository.updateById(id, updates);
    return await this.userRepository.findById(id, { fields: userAuthFields });
  }

  @authenticate('jwt')
  @patch('/users/{id}/follow/', {
    responses: {
      '204': {
        description: 'successful update',
      },
    },

  })
  async follow(
    @param.path.string('id') id: string,
    @param.query.boolean('follow') follow: boolean
  ): Promise<void> {
    let currentUser: any = null, otherUser: any = null;
    const currentUserPromise = this.userRepository.findById(id, { fields: { following: true, followers: true } }),
      otherUserPromise = this.userRepository.findById(id, { fields: { followers: true, following: true } });
    await Promise.all([currentUserPromise, otherUserPromise]).then(([current, other]) => {
      currentUser = current;
      otherUser = other;
    });

    const updatePromises: Promise<void>[] = [];

    const otherUpdates = (otherUser as UserWithRelations).followers;
    const currentUpdates = (currentUser as UserWithRelations).following;
    if (follow) {
      if (!otherUpdates.includes(this.user.id as string)) {
        otherUpdates.push(this.user.id as string);
        updatePromises.push(this.userRepository.updateById(id, { followers: otherUpdates }));
      }

      if (!currentUpdates.includes(id as string)) {
        currentUpdates.push(id as string);
        updatePromises.push(this.userRepository.updateById(this.user.id, { following: currentUpdates }))
      }
    } else {
      if (otherUpdates.includes(this.user.id as string)) {
        otherUpdates.splice(otherUpdates.indexOf(this.user.id as string), 1);
        updatePromises.push(this.userRepository.updateById(id, { followers: otherUpdates }));
      }
      if (currentUpdates.includes(id as string)) {
        currentUpdates.splice(currentUpdates.indexOf(id as string), 1);
        updatePromises.push(this.userRepository.updateById(this.user.id, { following: currentUpdates }))
      }
    }


    if (updatePromises.length) {
      await Promise.all(updatePromises);
    }
  }

  @post('/users/apply', {
    responses: {
      '204': {
        description: 'Seller POST success',
      },
    },
  })
  async apply(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SellerApplicationRequest),
        },
      },
    })
    request: SellerApplicationRequest,
  ): Promise<void> {

    const existingUser = await this.userRepository.findOne({ where: { instagramUsername: request.instagramUsername } });
    if (existingUser) {
      throw new HttpErrors.Conflict('That Instagram user already exists.');
    }

    const existinEmail = await this.userRepository.findOne({ where: { email: request.email } });
    if (existinEmail) {
      throw new HttpErrors.Conflict('That Email is already in use.');
    }

    const channels = [];
    if (request.channel1) {
      channels.push(request.channel1);
    }
    if (request.channel2) {
      channels.push(request.channel2)
    }
    if (request.channel3) {
      channels.push(request.channel3)
    }

    const rand = Math.random().toString();
    const now = new Date();
    const verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex');

    await this.userRepository.create({
      active: true,
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email.toLowerCase(),
      type: 'seller',
      emailVerified: false,
      emailVerificationCode: verficationCodeString,
      instagramUsername: request.instagramUsername,
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
        freeSales: 3,
        verificationStatus: 'unverified',
        address: { ...request.address, name: request.firstName + ' ' + request.lastName },
        approved: false,
        socialChannels: channels
      }
    });
  }

  @authenticate('jwt')
  @post('/users/verify', {
    responses: {
      '200': {
        description: 'Verification POST success',
      },
    },
  })
  async verify(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SellerAccountRequest),
        },
      },
    })
    request: SellerAccountRequest,
  ): Promise<User> {
    const account = await this.stripeService.createSeller(request, this.request.ip);
    const verificationStatus = account.individual?.verification?.status;
    let currentStatus: string;
    if (verificationStatus === 'verified') {
      currentStatus = 'verified';
    } else {
      currentStatus = 'review'
    }
    await this.userRepository.updateById(this.user.id as string, {
      firstName: request.firstName,
      lastName: request.lastName,
      stripeSellerId: account.id,
      seller: {
        verificationStatus: currentStatus,
        address: request.address,
        missingInfo: account.requirements?.currently_due || [],
        errors: account.requirements?.errors?.map(e => e.reason) || []
      }
    });
    return await this.userRepository.findById(this.user.id);
  }

  @authenticate('jwt')
  @post('/users/add-card', {
    responses: {
      '200': {
        description: 'Verification POST success',
      },
    },
  })
  async addCard(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Card),
        },
      },
    })
    card: Card,
  ): Promise<User> {
    const user = await this.userRepository.findById(this.user.id, { fields: { stripeCustomerId: true, cards: true } });
    if (!user.stripeCustomerId) {
      throw new HttpErrors.BadRequest('User does not have a stripe customer id');
    }
    const id = await this.stripeService.addCard(card.stripeId, user.stripeCustomerId);
    card.stripeId = id;
    user.cards.forEach(c => {
      if (c.primary) {
        delete c.primary;
      }
    });
    user.cards.push({ ...card, primary: true });
    await this.userRepository.updateById(this.user.id, { cards: user.cards });
    return await this.userRepository.findById(this.user.id, { fields: userAuthFields });
  }

  @authenticate('jwt')
  @post('/users/update-verification', {
    responses: {
      '204': {
        description: 'Verification POST success',
      },
    },
  })
  async updateVerification(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SellerAccountRequest),
          optional: [
            'lastName',
            'birthDay',
            'birthMonth',
            'birthYear',
            'address',
            'email',
            'phone',
            'ssn',
            'ssn4',
            'tosAcceptDate',
            'bankAccount',
            'documentFront',
            'documentBack:']
        },
      },
    })
    request: Partial<SellerAccountRequest>,
  ): Promise<User> {
    const user = await this.userRepository.findById(this.user.id);
    const account = await this.stripeService.updateSeller(user.stripeSellerId as string, request);
    const seller: SellerDetails = {
      ...user.seller,
      verificationStatus: 'review',
      missingInfo: account.requirements?.currently_due || [],
      errors: account.requirements?.errors?.map(e => e.reason) || []
    }
    if (request.address) {
      seller.address = request.address;
    }
    await this.userRepository.updateById(this.user.id as string, { seller: seller });
    return await this.userRepository.findById(this.user.id);
  }

  @authenticate('jwt')
  @post('/users/add-bank', {
    responses: {
      '204': {
        description: 'Verification POST success',
      },
    },
  })
  async addBank(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(BankAccountRequest),
        },
      },
    })
    request: BankAccountRequest
  ): Promise<User> {
    const user = await this.userRepository.findById(this.user.id);
    if (!user.stripeSellerId) {
      throw new HttpErrors.Forbidden('You must fill out the verification form before adding a bank acount.');
    }
    await this.stripeService.createBankAccount(user.stripeSellerId as string, request);
    if (user.seller && user.seller.missingInfo) {
      if (user.seller.missingInfo.indexOf('external_account') > -1) {
        const updates: string[] = [];
        user.seller.missingInfo.forEach(item => {
          if (item !== 'external_account') {
            updates.push(item);
          }
        })
        await this.userRepository.updateById(this.user.id as string, { 'seller.missingInfo': updates } as any);
      }
    }
    return await this.userRepository.findById(this.user.id);
  }

  @post('/users/support', {
    responses: {
      '204': {
        description: 'Support success',
      },
    },
  })
  async support(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SupportRequest),
        },
      },
    })
    request: SupportRequest
  ): Promise<void> {
    await this.sendGridService.sendEmail('support@relovely.com',
      `Support ticket`,
      request.body, request.email);
  }

  @authenticate('jwt')
  @post('/users/add-document', {
    responses: {
      '204': {
        description: 'Verification POST success',
      },
    },
  })
  async addDocument(
    @requestBody({
      description: 'multipart/form-data value.',
      required: true,
      content: {
        'multipart/form-data': {
          // Skip body parsing
          'x-parser': 'stream',
          schema: { type: 'object' },
        },
      },
    })
    request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.handler(request, response, (err: unknown) => {
        if (err) reject(err);
        else {
          const uploadedFiles = (request.files as any[]);
          this.stripeService.uploadFile(uploadedFiles[0].buffer).then(result => {
            response.status(200).send(result);
            resolve();
          }, error => {
            reject(err);
          })
        }
      });
    });
  }

  @post('/users/stripe-webhook', {
    responses: {
      '204': {
        description: 'Verification POST success',
      },
    },
  })
  async stripeWebhook(
    @requestBody({
      description: 'application/json value.',
      required: true,
      content: {
        'application/json': {
          // Skip body parsing
          'x-parser': 'raw'
        },
      },
    })
    request: Buffer,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<void> {
    let event: Stripe.Event;
    const signature = this.request.headers['stripe-signature'];
    try {
      event = this.stripeService.retrieveEvent(request, signature);
    } catch (err) {
      throw new HttpErrors.BadRequest;
    }

    switch (event.type) {
      case ('account.updated'): {
        const account = event.data.object as Stripe.Account;
        const user = await this.userRepository.findOne({ where: { stripeSellerId: account.id } });
        if (!user) {
          throw new HttpErrors.NotFound;
        }
        if (account.individual?.verification?.status === 'verified') {
          await this.userRepository.updateById(user.id, { 'seller.verificationStatus': 'verified', 'seller.missingInfo': account.requirements?.currently_due, 'seller.errors': [] } as any);
          response.status(200).send('success');
          break;
        }
        const reason = account.requirements?.disabled_reason;
        if (reason) {
          if (reason.startsWith('rejected') || reason === 'listed') {
            await this.userRepository.updateById(user.id, { 'seller.verificationStatus': 'rejected', 'seller.missingInfo': [], 'seller.errors': [] } as any);
            response.status(200).send('success');
            break;
          }
          if (['requirements.pending_verification', 'under_review', 'other', 'requirements.past_due'].indexOf(reason) > -1) {
            if (account.requirements && account.requirements.currently_due && account.requirements.currently_due.length) {
              if (user.seller) {
                await this.userRepository.updateById(user.id, {
                  'seller.missingInfo': account.requirements?.currently_due,
                  'seller.errors': account.requirements.errors?.map(e => e.reason) || []
                } as any);
              }
            } else {
              await this.userRepository.updateById(user.id, { 'seller.verificationStatus': 'review', 'seller.missingInfo': [], 'seller.errors': [] } as any);
            }
            response.status(200).send('success');
            break;
          }
        }
        break;
      }
      default:
        response.status(200).send('success');
        break;
    }
  }


}
