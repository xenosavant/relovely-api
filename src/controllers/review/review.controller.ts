import { authenticate } from '@loopback/authentication';
import { ReviewRepository } from '../../repositories/review.repository';
import { repository, Order } from '@loopback/repository';
import { Review, ReviewWithRelations } from '../../models/review.model';
import { post, getModelSchemaRef, param, requestBody, HttpErrors, get } from '@loopback/rest';
import { Product, ProductWithRelations, UserWithRelations, OrderWithRelations, ProductRelations, User } from '../../models';
import { OrderRequest } from '../order/order.request';
import { OrderRepository, UserRepository, ProductRepository } from '../../repositories';
import { inject } from '@loopback/core';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { SecurityBindings } from '@loopback/security';
import moment from 'moment-timezone';
import { userListFields, UserList } from '../user/response/user-list.interface';
import { UserReviewsResponse } from '../user/response/user-reviews-response';

export class ReviewController {

  constructor(
    @repository(ReviewRepository)
    public reviewRepository: ReviewRepository,
    @repository(OrderRepository)
    public orderRepository: OrderRepository,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(ProductRepository)
    public productRepository: ProductRepository,
    @inject(SecurityBindings.USER, { optional: true })
    private user: AppUserProfile,
  ) { }

  @authenticate('jwt')
  @post('/products/{id}/review', {
    responses: {
      '200': {
        description: 'Review model instance',
        content: { 'application/json': { schema: getModelSchemaRef(Review) } },
      },
    },
  })
  async create(
    @param.path.string('id') id: typeof Product.prototype.id,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Review, { optional: ['date'] })
        },
      },
    }) review: Partial<Review>
  ): Promise<OrderWithRelations> {
    if (!id) {
      throw new HttpErrors.BadRequest();
    }
    let product: any,
      buyer: any,
      order: any,
      productPromise = this.productRepository.findById(id, { fields: { id: true, sellerId: true }, include: [{ relation: 'review' }] }),
      userPromise = this.userRepository.findById(this.user.id, { fields: { id: true } }),
      orderPromise = this.orderRepository.findOne({ where: { productId: id }, fields: { id: true, sellerId: true, buyerId: true } });
    await Promise.all([productPromise, userPromise, orderPromise]).then(([p, u, o]) => {
      order = o as OrderWithRelations;
      product = p as ProductWithRelations;
      buyer = u as UserWithRelations;
    });
    if (order && buyer && product) {
      if (product.review) {
        throw new HttpErrors.Conflict('Product has already been reviewed');
      }
      if (order.buyerId.toString() !== this.user.id) {
        throw new HttpErrors.Forbidden();
      }
      review.reviewerId = this.user.id as string;
      review.productId = product.id;
      review.orderId = order.id;
      review.sellerId = product.sellerId;
      review.date = moment.utc().toDate();
      await this.productRepository.review(id).create(review);
      return this.orderRepository.findById(order.id, {
        include: [{ relation: 'buyer', scope: { fields: userListFields } },
        { relation: 'seller', scope: { fields: userListFields } },
        { relation: 'product' },
        { relation: 'review' }]
      })
    } else {
      throw new HttpErrors.BadRequest();
    }

  }

  @get('/users/{id}/reviews', {
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
  async reviews(
    @param.path.string('id') id: string
  ): Promise<UserReviewsResponse> {
    const user = await this.userRepository.findById(id, { fields: { username: true } });
    const reviews: ReviewWithRelations[] = await this.reviewRepository.find({
      where: { sellerId: id },
      fields: { id: true, body: true, rating: true, date: true, title: true, productId: true, reviewerId: true },
      include: [{ relation: 'product', scope: { fields: { title: true, id: true } } },
      { relation: 'reviewer', scope: { fields: userListFields } }]
    });
    return { name: user.username as string, reviews: reviews.map(r => { return { ...r, percentage: (r.rating / 5) * 100, reviewer: r.reviewer as UserList } }) };
  }

}
