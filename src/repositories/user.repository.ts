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
import { UI } from '../models/user-preferences.model';
import { SellerDetails } from '../models/seller-details';
import { MailChimpService } from '../services/mailchimp/mailchimp.service';
import { Promo } from '../models/promo.model';
import { PromoRepository } from './promo.repository';

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

  public readonly promos: HasManyRepositoryFactory<Promo, typeof User.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('ProductRepository') protected productRepositoryGetter: Getter<ProductRepository>,
    @repository.getter('OrderRepository') protected orderRepositoryGetter: Getter<OrderRepository>,
    @repository.getter('ReviewRepository') protected reviewRepositoryGetter: Getter<ReviewRepository>,
    @repository.getter('PromoRepository') protected promoRepositoryGetter: Getter<PromoRepository>,
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
    this.ratings = this.createHasManyRepositoryFactoryFor('ratings', reviewRepositoryGetter);
    this.registerInclusionResolver('ratings', this.products.inclusionResolver);
    this.promos = this.createHasManyRepositoryFactoryFor('promos', promoRepositoryGetter);
    this.registerInclusionResolver('promos', this.promos.inclusionResolver);
  }

  public async createUser(email: string, type: 'seller' | 'member', stripeId: string, username?: string,
    firstName?: string, lastName?: string, seller?: SellerDetails): Promise<UserWithRelations> {

    const rand = Math.random().toString(),
      now = new Date(),
      verificationCode = crypto.createHash('sha256').update(rand + now.getDate()),
      verficationCodeString = verificationCode.digest('hex'),
      downcasedEmail = email.toLowerCase();
    let user: UserWithRelations;

    if (type === 'member') {
      user = await this.create({
        active: true,
        username: username,
        firstName: firstName,
        lastName: lastName,
        email: downcasedEmail,
        type: 'member',
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
        instagramUsername: username,
        firstName: firstName,
        lastName: lastName,
        email: email.toLowerCase(),
        type: 'seller',
        stripeCustomerId: stripeId,
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
        },
        seller: seller
      })
    }
    return user;
  }

  async addRemoveMailingList(user: UserWithRelations, add: boolean) {
    let update: UI;
    const ui = user.ui;
    if (ui) {
      update = { ...ui, joinedMailingList: add, id: undefined } as any;
    } else {
      update = { joinedMailingList: add };
    }
    await this.updateById(user.id, { ui: update });
  }
}
