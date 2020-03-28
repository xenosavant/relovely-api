import {DefaultCrudRepository} from '@loopback/repository';
import {Lookup, LookupRelations} from '../models';
import {DbDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class LookupRepository extends DefaultCrudRepository<
  Lookup,
  typeof Lookup.prototype.id,
  LookupRelations
> {
  constructor(
    @inject('datasources.db') dataSource: DbDataSource,
  ) {
    super(Lookup, dataSource);
  }
}
