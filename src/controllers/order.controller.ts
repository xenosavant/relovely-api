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
  HttpErrors,
} from '@loopback/rest';
import { Order, User, Product } from '../models';
import { OrderRepository, UserRepository, ProductRepository } from '../repositories';
import { inject } from '@loopback/core';
import { SecurityBindings } from '@loopback/security';
import { AppUserProfile } from '../authentication/app-user-profile';
import { authenticate } from '@loopback/authentication';
import * as moment from 'moment'
import { userListFields } from './user/response/user-list.interface';
import { ListResponse } from './list-response';

@authenticate('jwt')
export class OrderController {
  constructor(
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile
  ) { }

  @post('/products/{id}/orders', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Order) } },
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof Product.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Order, {
            title: 'NewOrderInUser',
            exclude: ['id'],
            optional: ['sellerId', 'buyerId', 'purchaseDate', 'shipDate', 'deliveryDate',
              'total', 'status', 'shippingCost', 'tax']
          }),
        },
      },
    }) order: Omit<Order, 'id'>,
  ): Promise<Order> {
    const product = await this.productRepository.findById(id);
    if (!product.sold) {
      order.sellerId = product.sellerId;
      order.buyerId = this.user.id as string;
      order.purchaseDate = moment.utc().toDate();
      order.status = 'ordered';
      product.sold = true;
      await this.productRepository.update(product);
      return this.productRepository.order(id).create(order);
    } else {
      throw new HttpErrors.Conflict('This product is no longer available');
    }
  }

  @get('/orders', {
    responses: {
      '200': {
        description: 'Array of Order model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Order, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async find(
    @param.query.boolean('sales') sales?: boolean
  ): Promise<ListResponse<Order>> {
    const currentUser = await this.userRepository.findById(this.user.id);
    const include = [{ relation: 'product' },
    { relation: 'buyer', scope: { fields: userListFields } },
    { relation: 'seller', scope: { fields: userListFields } }];
    let where = {};
    let relation: string;
    include.push();
    let list = [];
    if (currentUser.type === 'seller') {
      if (sales) {
        where = { sellerId: currentUser.id };
      } else {
        where = { buyerId: currentUser.id };
      }
    } else {
      where = { buyerId: currentUser.id };
    }
    list = await this.orderRepository.find({ where: where, include: include });
    return {
      count: list.length,
      items: list
    }
  }

  @patch('/orders', {
    responses: {
      '200': {
        description: 'Order PATCH success count',
        content: { 'application/json': { schema: CountSchema } },
      },
    },
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Order, { partial: true }),
        },
      },
    })
    order: Order,
    @param.query.object('where', getWhereSchemaFor(Order)) where?: Where<Order>,
  ): Promise<Count> {
    return this.orderRepository.updateAll(order, where);
  }

  @get('/orders/{id}', {
    responses: {
      '200': {
        description: 'Order model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Order, { includeRelations: true }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<Order> {
    return this.orderRepository.findById(id, {
      include: [{ relation: 'buyer', scope: { fields: userListFields } },
      { relation: 'seller', scope: { fields: userListFields } },
      { relation: 'product' }]
    });
  }

  @patch('/orders/{id}', {
    responses: {
      '204': {
        description: 'Order PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Order, { partial: true }),
        },
      },
    })
    order: Order,
  ): Promise<void> {
    await this.orderRepository.updateById(id, order);
  }

  @put('/orders/{id}', {
    responses: {
      '204': {
        description: 'Order PUT success',
      },
    },
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() order: Order,
  ): Promise<void> {
    await this.orderRepository.replaceById(id, order);
  }

  @del('/orders/{id}', {
    responses: {
      '204': {
        description: 'Order DELETE success',
      },
    },
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.orderRepository.deleteById(id);
  }
}
