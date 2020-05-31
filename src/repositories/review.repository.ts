import { DefaultCrudRepository, BelongsToAccessor, repository, HasOneRepositoryFactory } from '@loopback/repository';
import { DbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UserRepository, ProductRepository } from '.';
import { Review, ReviewRelations } from '../models/review.model';
import { User, Product } from '../models';

export class ReviewRepository extends DefaultCrudRepository<
  Review,
  typeof Review.prototype.id,
  ReviewRelations
  > {
  public readonly reviewer: BelongsToAccessor<User, typeof Review.prototype.id>;
  public readonly seller: BelongsToAccessor<User, typeof Review.prototype.id>;
  public readonly product: BelongsToAccessor<Product, typeof Product.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
    @repository.getter('ProductRepository') protected productRepositoryGetter: Getter<ProductRepository>
  ) {
    super(Review, dataSource);
    this.seller = this.createBelongsToAccessorFor('seller', userRepositoryGetter);
    this.registerInclusionResolver('seller', this.seller.inclusionResolver);
    this.reviewer = this.createBelongsToAccessorFor('reviewer', userRepositoryGetter);
    this.registerInclusionResolver('buyer', this.reviewer.inclusionResolver);
    this.product = this.createBelongsToAccessorFor('product', productRepositoryGetter);
    this.registerInclusionResolver('product', this.product.inclusionResolver);
  }
}
