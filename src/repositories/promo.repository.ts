import { DefaultCrudRepository, BelongsToAccessor, repository } from '@loopback/repository';
import { DbDataSource } from '../datasources';
import { inject, Getter } from '@loopback/core';
import { Promo, PromoRelations } from '../models/promo.model';
import { User } from '../models';
import { UserRepository } from './user.repository';

export class PromoRepository extends DefaultCrudRepository<
  Promo,
  typeof Promo.prototype.id,
  PromoRelations
  > {
  public readonly seller: BelongsToAccessor<User, typeof Promo.prototype.id>;
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
    @repository.getter('UserRepository') protected userRepositoryGetter: Getter<UserRepository>,
  ) {
    super(Promo, dataSource);
    this.seller = this.createBelongsToAccessorFor('seller', userRepositoryGetter);
    this.registerInclusionResolver('seller', this.seller.inclusionResolver);
  }
}
