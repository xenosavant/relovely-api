import { DefaultCrudRepository, repository, BelongsToAccessor } from '@loopback/repository';
import { Product, UserRelations, User, ProductRelations } from '../models';
import { DbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { UserRepository } from './user.repository';

export class ProductRepository extends DefaultCrudRepository<
  Product,
  typeof Product.prototype.id,
  ProductRelations
  > {

  public readonly seller: BelongsToAccessor<User, typeof Product.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource, @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(Product, dataSource);
    this.seller = this.createBelongsToAccessorFor('seller', userRepositoryGetter);
    this.registerInclusionResolver('seller', this.seller.inclusionResolver);
  }
}
