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
  requestBody,
  HttpErrors
} from '@loopback/rest';
import { User, UserWithRelations, Product } from '../../models';
import { UserRepository, ProductRepository } from '../../repositories';
import { UserList, userListFields } from './response/user-list.interface';
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
import { InstagramService } from '../../services';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(ProductRepository)
    public productsRepository: ProductRepository,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile,
    @service(InstagramService)
    public instagramService: InstagramService
  ) { }

  productListFields = {
    id: true, title: true, seller: true, imageUrls: true, videoUrls: true, auction: true,
    auctionStart: true, auctionEnd: true, currentBid: true, sizeId: true, size: true, price: true, sold: true
  }

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
    return this.userRepository.findById(this.user.id as string, { fields: userDetailFields });
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
    const user: UserWithRelations = await this.userRepository.findById(id,
      {
        fields: userDetailFields,
        include: [{ relation: 'products', scope: { fields: productDetailFields } }]
      });
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
    }
    promises.push(
      this.userRepository.find({
        where: { id: { inq: user.favorites || [] } },
        fields: userListFields
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

    response.listings = response.products ? response.products.filter((p: Product) => !p.sold) : [];
    response.sales = response.products ? response.products.filter((p: Product) => p.sold) : [];
    delete response.products;

    const detailResponse = { ...response } as UserDetail;
    return detailResponse;
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
    const keys = Object.keys(updates);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!userUpdateFields.includes(key)) {
        throw new HttpErrors.Forbidden();
      }
      if (key === 'username') {
        const username = updates['username'] as string;
        const existingUsername = await this.userRepository.findOne({ where: { username: username } });
        if (existingUsername) {
          throw new HttpErrors.Conflict('Username already exists');
        }

        const instaUser = await this.instagramService.getUserProfile(username);
        if (instaUser) {
          throw new HttpErrors.Conflict('Username already exists on Instagram');
        }
      }
    }
    await this.userRepository.updateById(id, updates);
    return await this.userRepository.findById(id, { fields: userDetailFields });
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

  @put('/users/{id}', {
    responses: {
      '204': {
        description: 'User PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() user: User,
  ): Promise<void> {
    await this.userRepository.replaceById(id, user);
  }


}
