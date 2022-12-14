import { DefaultCrudRepository, repository, BelongsToAccessor, HasOneRepositoryFactory } from '@loopback/repository';
import { Product, UserRelations, User, ProductRelations, Order } from '../models';
import { DbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UserRepository } from './user.repository';
import { OrderRepository } from './order.repository';
import { Review } from '../models/review.model';
import { ReviewRepository } from './review.repository';

export class ProductRepository extends DefaultCrudRepository<
  Product,
  typeof Product.prototype.id,
  ProductRelations
  > {

  public readonly seller: BelongsToAccessor<User, typeof Product.prototype.id>;

  public readonly order: HasOneRepositoryFactory<Order, typeof Product.prototype.id>;

  public readonly review: HasOneRepositoryFactory<Review, typeof Product.prototype.id>;

  public readonly dataSource: DbDataSource;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('OrderRepository') protected orderRepositoryGetter: Getter<OrderRepository>,
    @repository.getter('ReviewRepository') protected reviewRepositoryGetter: Getter<ReviewRepository>,
  ) {
    super(Product, dataSource);
    this.order = this.createHasOneRepositoryFactoryFor('order', orderRepositoryGetter);
    this.registerInclusionResolver('order', this.order.inclusionResolver);
    this.review = this.createHasOneRepositoryFactoryFor('review', reviewRepositoryGetter);
    this.registerInclusionResolver('review', this.review.inclusionResolver);
    this.seller = this.createBelongsToAccessorFor('seller', userRepositoryGetter);
    this.registerInclusionResolver('seller', this.seller.inclusionResolver);
    this.dataSource = dataSource;
  }
}
