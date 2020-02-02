import { DefaultCrudRepository } from '@loopback/repository';
import { Order, UserRelations } from '../models';
import { DbDataSource } from '../datasources';
import { inject } from '@loopback/core';

export class OrderRepository extends DefaultCrudRepository<
  Order,
  typeof Order.prototype.id,
  UserRelations
  > {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Order, dataSource);
  }
}
