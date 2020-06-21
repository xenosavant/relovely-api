import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
  PredicateComparison,
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
import { Product, User, ProductWithRelations } from '../../models';
import { ProductRepository, UserRepository } from '../../repositories';
import { ProductDetail, productDetailFields } from './response/product-detail.interface';
import { userListFields, UserList } from '../user/response/user-list.interface';
import { ListResponse } from '../list-response';
import { PriceFilter } from './request/price-filter';
import { authenticate } from '@loopback/authentication';
import { SecurityBindings } from '@loopback/security';
import { inject } from '@loopback/core';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { request } from 'http';
import { productListFields, ProductList } from './response/product-list.interface';
import { ProductDetailResponse } from './response/product-detail.response';
const ObjectId = require('mongodb').ObjectId

export class ProductController {
  constructor(
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile
  ) { }

  @get('/products', {
    responses: {
      '200': {
        description: 'Array of Product model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Product, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async find(
    @param.query.string('category') category: string,
    @param.query.string('pageLength') pageLength: number,
    @param.query.string('sizes') sizes?: string,
    @param.query.string('colors') colors?: string,
    @param.query.string('prices') prices?: string,
    @param.query.string('terms') terms?: string,
    @param.query.string('page') page?: number,
  ): Promise<ListResponse<ProductWithRelations>> {
    const where: Where<Product> = {
      and: [
        { sold: false },
        { active: true },
      ]
    };

    const pageNumber = page || 0;

    if (terms) {
      const termsArray = terms.split(',');
      termsArray.forEach(term => {
        where.and.push({
          or: [{ title: { regexp: `/${term}/i` } },
          { tags: { regexp: `/^${term}/i` } }]
        });
      })
    }

    if (category !== '0') {
      where.and.push({ categories: { regexp: `^${category}$` } });
    }

    let priceArray;
    if (prices) {
      priceArray = JSON.parse(prices) as PriceFilter[];
      if (priceArray.length) {
        const orQuery: any = { or: [] };
        priceArray?.forEach(filter => {
          if (!filter.min && filter.min !== 0) {
            orQuery.or.push({ price: { lte: filter.max } });
          } else if (!filter.max && filter.max !== 0) {
            orQuery.or.push({ price: { gte: filter.min } });
          } else {
            orQuery.or.push({
              and:
                [
                  { price: { gte: filter.min } },
                  { price: { lte: filter.max } },
                ]
            });
          }
        });
        where.and.push(orQuery);
      }
    }

    if (sizes) {
      let parsed = sizes.split(',');
      const and: any = { or: [] };
      parsed.forEach(size => {
        and.or.push({ sizeId: size });
      })
      where.and.push(and);
    }

    if (colors) {
      let parsed = colors.split(',');
      const and: any = { or: [] };
      parsed.forEach(color => {
        and.or.push({ colorId: color });
      })
      where.and.push(and);
    }

    let count: number = 0, products: ProductWithRelations[] = [];

    const productPromise = this.productRepository.find({
      where: where,
      skip: pageNumber * pageLength,
      limit: pageLength,
      include: [{ relation: 'seller', scope: { fields: userListFields } }]
    }).then(response => products = response);

    const countPromise = this.productRepository.count(where).then(response => count = response.count);

    await Promise.all([productPromise, countPromise]);

    return {
      count: count,
      items: products
    }
  }

  @authenticate('jwt')
  @get('/products/favorites', {
    responses: {
      '200': {
        description: 'Array of Product model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Product, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async favorites(
  ): Promise<ListResponse<ProductWithRelations>> {
    const me = await this.userRepository.findById(this.user.id, { fields: { favorites: true } });
    const products = await this.productRepository.find({
      where: {
        and: [
          { id: { inq: me.favorites } },
          { active: true }
        ]
      },
      include: [{ relation: 'seller', scope: { fields: userListFields } }]
    });
    return {
      count: products.length,
      items: products
    }

  }

  @authenticate('jwt')
  @get('/products/listings', {
    responses: {
      '200': {
        description: 'Array of Product model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Product, { includeRelations: true }),
            },
          },
        },
      },
    },
  })
  async listings(
  ): Promise<ListResponse<ProductWithRelations>> {
    const me = await this.userRepository.findById(this.user.id, { fields: { type: true } });
    if (!me || me.type !== 'seller') {
      throw new HttpErrors.Forbidden('Invalid seller');
    }
    const products = await this.productRepository.find({
      where: {
        sellerId: this.user.id,
        active: true
      }, order: ['sold ASC'],
      include: [{ relation: 'seller', scope: { fields: userListFields } }]
    });
    return {
      count: products.length,
      items: products
    }
  }


  @authenticate('jwt')
  @post('/users/{id}/products', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Product) } },
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof User.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Product, {
            title: 'NewProductInUser',
            optional: ['sellerId', 'size', 'sizeId', 'sold', 'auction']
          }),
        },
      },
    }) product: Omit<Product, 'id'>,
  ): Promise<Product> {
    if (this.user.id !== id) {
      throw new HttpErrors.Forbidden;
    }
    product.active = true;
    product.sold = false;
    product.auction = false;
    return this.userRepository.products(id).create(product);
  }

  @get('/products/{id}', {
    responses: {
      '200': {
        description: 'Product model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Product, { includeRelations: true }),
          },
        },
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<ProductDetailResponse> {
    const product = await this.productRepository.findById(id, {
      fields: productDetailFields, include: [{ relation: 'seller', scope: { fields: userListFields } }]
    }) as any;

    const more = (await this.productRepository.find({ where: { sellerId: product.sellerId, id: { neq: ObjectId(id) } }, fields: productListFields })) as unknown;

    if (!product.active) {
      throw new HttpErrors.NotFound();
    }
    const response = product as ProductDetail;
    return {
      product: response,
      more: more as ProductList[]
    }
  }

  @authenticate('jwt')
  @patch('/products/{id}', {
    responses: {
      '204': {
        description: 'Product PATCH success',
      },
    },
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Product, { partial: true }),
        },
      },
    })
    product: Product,
  ): Promise<void> {
    const oldProduct = await this.productRepository.findById(id);
    if (this.user.id !== oldProduct.sellerId.toString()) {
      throw new HttpErrors.Forbidden;
    }
    await this.productRepository.updateById(id, product);
  }

  @authenticate('jwt')
  @patch('/products/{id}/favorite', {
    responses: {
      '200': {
        description: 'Product PATCH success',
      },
    },
  })
  async favorite(
    @param.path.string('id') id: string
  ): Promise<void> {
    const user = await this.userRepository.findById(this.user.id, { fields: { favorites: true } });
    if (!user.favorites.includes(id)) {
      await this.userRepository.updateById(this.user.id, { $push: { favorites: ObjectId(id) } } as any);
    } else {
      await this.userRepository.updateById(this.user.id, { $pull: { favorites: ObjectId(id) } } as any);
    }
  }

  @authenticate('jwt')
  @del('/products/{id}')
  async delete(
    @param.path.string('id') id: string,
  ) {
    const product = await this.productRepository.findById(id, { fields: { sellerId: true } });
    const sellerId = product.sellerId.toString();
    if (product.sellerId.toString() !== this.user.id) {
      throw new HttpErrors.Forbidden();
    }
    await this.productRepository.updateById(id, { active: false });
  }
}
