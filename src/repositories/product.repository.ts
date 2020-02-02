import { DefaultCrudRepository } from '@loopback/repository';
import { Product, UserRelations } from '../models';
import { DbDataSource } from '../datasources';
import { inject } from '@loopback/core';

export class ProductRepository extends DefaultCrudRepository<
  Product,
  typeof Product.prototype.id,
  UserRelations
  > {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Product, dataSource);
  }
}
