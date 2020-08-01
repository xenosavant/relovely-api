import { DefaultCrudRepository, repository, HasManyRepositoryFactory } from '@loopback/repository';
import { User, UserRelations, Product, Order, UserWithRelations } from '../models';
import { DbDataSource } from '../datasources';
import { inject, Getter, service } from '@loopback/core';
import { ProductRepository } from './product.repository';
import { OrderRepository } from './order.repository';
import { Review } from '../models/review.model';
import { ReviewRepository } from './review.repository';
import * as crypto from 'crypto';
import { SendgridService } from '../services';
import { StripeService } from '../services/stripe/stripe.service';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
  > {

  public readonly products: HasManyRepositoryFactory<Product, typeof User.prototype.id>;

  public readonly purchases: HasManyRepositoryFactory<Order, typeof User.prototype.id>;

  public readonly sales: HasManyRepositoryFactory<Order, typeof User.prototype.id>;

  public readonly reviews: HasManyRepositoryFactory<Review, typeof User.prototype.id>;

  public readonly ratings: HasManyRepositoryFactory<Review, typeof User.prototype.id>;

  constructor(
    @service(SendgridService)
    public sendGridService: SendgridService,
    @service(StripeService)
    public stripeService: StripeService,
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('ProductRepository') protected productRepositoryGetter: Getter<ProductRepository>,
    @repository.getter('OrderRepository') protected orderRepositoryGetter: Getter<OrderRepository>,
    @repository.getter('ReviewRepository') protected reviewRepositoryGetter: Getter<ReviewRepository>,
  ) {
    super(User, dataSource);
    this.sales = this.createHasManyRepositoryFactoryFor('sales', orderRepositoryGetter);
    this.registerInclusionResolver('sales', this.sales.inclusionResolver);
    this.purchases = this.createHasManyRepositoryFactoryFor('purchases', orderRepositoryGetter);
    this.registerInclusionResolver('purchases', this.purchases.inclusionResolver);
    this.products = this.createHasManyRepositoryFactoryFor('products', productRepositoryGetter);
    this.registerInclusionResolver('products', this.products.inclusionResolver);
    this.reviews = this.createHasManyRepositoryFactoryFor('reviews', reviewRepositoryGetter);
    this.registerInclusionResolver('reviews', this.reviews.inclusionResolver);
    this.ratings = this.createHasManyRepositoryFactoryFor('products', reviewRepositoryGetter);
    this.registerInclusionResolver('products', this.products.inclusionResolver);
  }

  public async createUser(email: string, type: 'seller' | 'member', username?: string,
    firstName?: string, lastName?: string): Promise<UserWithRelations> {

    const rand = Math.random().toString(),
      now = new Date(),
      verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex'),
      downcasedEmail = email.toLowerCase(),
      stripeId = await this.stripeService.createCustomer(downcasedEmail);
    let user: UserWithRelations;

    if (type === 'member') {
      user = await this.create({
        active: true,
        username: username,
        firstName: firstName,
        lastName: lastName,
        email: downcasedEmail,
        type: 'member',
        emailVerified: false,
        stripeCustomerId: stripeId,
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
        }
      });
    } else {
      /// TODO: Create Seller
      user = await this.create({
        active: true,
        username: username,
        firstName: firstName,
        lastName: lastName,
        email: email.toLowerCase(),
        type: 'seller',
        emailVerified: false,
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
        }
      })
    }

    await this.sendGridService.sendEmail(email,
      'Welcome To Relovely!',
      `Click <a href="${process.env.WEB_URL}/account/verify?type=${type}&code=${encodeURI(verficationCodeString)}">here</a> to verify your email.`);

    return user;
  }
}
