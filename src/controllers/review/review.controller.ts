import { authenticate } from '@loopback/authentication';
import { ReviewRepository } from '../../repositories/review.repository';
import { repository, Order } from '@loopback/repository';
import { Review } from '../../models/review.model';
import { post, getModelSchemaRef, param, requestBody, HttpErrors } from '@loopback/rest';
import { Product, ProductWithRelations, UserWithRelations, OrderWithRelations, ProductRelations } from '../../models';
import { OrderRequest } from '../order/order.request';
import { OrderRepository, UserRepository, ProductRepository } from '../../repositories';
import { inject } from '@loopback/core';
import { AppUserProfile } from '../../authentication/app-user-profile';
import { SecurityBindings } from '@loopback/security';
import moment from 'moment';
import { userListFields } from '../user/response/user-list.interface';

@authenticate('jwt')
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
      productPromise = this.productRepository.findById(id, { fields: { id: true }, include: [{ relation: 'review' }] }),
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
      review.sellerId = id as string;
      review.productId = product.id;
      review.orderId = order.id;
      review.date = moment().toDate();
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

}
