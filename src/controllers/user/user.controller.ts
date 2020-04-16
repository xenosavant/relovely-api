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
import { inject } from '@loopback/core';
import { SecurityBindings } from '@loopback/security';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { userUpdateFields } from './user-update-fields';

@authenticate('jwt')
export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(ProductRepository)
    public productsRepository: ProductRepository,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile
  ) { }

  productListFields = {
    id: true, title: true, seller: true, imageUrls: true, videoUrls: true, auction: true,
    auctionStart: true, auctionEnd: true, currentBid: true, sizeId: true, size: true, price: true, sold: true
  }

  @post('/users', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(User) } },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(User, {
            title: 'NewUser',
            exclude: ['id'],
          }),
        },
      },
    })
    user: Omit<User, 'id'>,
  ): Promise<User> {
    return this.userRepository.create(user);
  }

  @get('/users/count', {
    responses: {
      '200': {
        description: 'User model count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  @authenticate('jwt')
  async count(
    @param.query.object('where', getWhereSchemaFor(User)) where?: Where<User>,
  ): Promise<Count> {
    return this.userRepository.count(where);
  }

  @get('/users', {
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
  ): Promise<User[]> {
    return this.userRepository.find(filter);
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

  @patch('/users/{id}', {
    responses: {
      '204': {
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
  ): Promise<void> {
    if (this.user.id !== id) {
      throw new HttpErrors.Forbidden();
    }
    Object.keys(updates).forEach(key => {
      if (!userUpdateFields.includes(key)) {
        throw new HttpErrors.Forbidden();
      }
    })
    await this.userRepository.updateById(id, updates);
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

  @del('/users/{id}', {
    responses: {
      '204': {
        description: 'User DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.userRepository.deleteById(id);
  }


}
