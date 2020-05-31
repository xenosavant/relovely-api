import { DefaultCrudRepository, BelongsToAccessor, repository, HasOneRepositoryFactory } from '@loopback/repository';
import { Order, UserRelations, User, Product, OrderRelations } from '../models';
import { DbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UserRepository, ProductRepository } from '.';
import { ReviewRepository } from './review.repository';
import { Review } from '../models/review.model';

export class OrderRepository extends DefaultCrudRepository<
  Order,
  typeof Order.prototype.id,
  OrderRelations
  > {
  public readonly seller: BelongsToAccessor<User, typeof Order.prototype.id>;
  public readonly buyer: BelongsToAccessor<User, typeof Order.prototype.id>;
  public readonly product: BelongsToAccessor<Product, typeof Order.prototype.id>;
  public readonly review: HasOneRepositoryFactory<Review, typeof Order.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('ProductRepository') protected productRepositoryGetter: Getter<ProductRepository>,
    @repository.getter('ReviewRepository') protected reviewRepositoryGetter: Getter<ReviewRepository>,
  ) {
    super(Order, dataSource);
    this.seller = this.createBelongsToAccessorFor('seller', userRepositoryGetter);
    this.registerInclusionResolver('seller', this.seller.inclusionResolver);
    this.buyer = this.createBelongsToAccessorFor('buyer', userRepositoryGetter);
    this.registerInclusionResolver('buyer', this.buyer.inclusionResolver);
    this.product = this.createBelongsToAccessorFor('product', productRepositoryGetter);
    this.registerInclusionResolver('product', this.product.inclusionResolver);
    this.review = this.createHasOneRepositoryFactoryFor('review', reviewRepositoryGetter);
    this.registerInclusionResolver('review', this.review.inclusionResolver);
  }
}
