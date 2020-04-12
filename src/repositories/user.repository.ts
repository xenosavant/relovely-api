import {DefaultCrudRepository, repository, HasManyRepositoryFactory} from '@loopback/repository';
import {User, UserRelations, Product, Order} from '../models';
import {DbDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {ProductRepository} from './product.repository';
import {OrderRepository} from './order.repository';

export class UserRepository extends DefaultCrudRepository<
  User,
  typeof User.prototype.id,
  UserRelations
> {

  public readonly products: HasManyRepositoryFactory<Product, typeof User.prototype.id>;

  public readonly purchases: HasManyRepositoryFactory<Order, typeof User.prototype.id>;

  public readonly sales: HasManyRepositoryFactory<Order, typeof User.prototype.id>;

  constructor(
    @inject('datasources.db') dataSource: DbDataSource, @repository.getter('ProductRepository') protected productRepositoryGetter: Getter<ProductRepository>, @repository.getter('OrderRepository') protected orderRepositoryGetter: Getter<OrderRepository>,
  ) {
    super(User, dataSource);
    this.sales = this.createHasManyRepositoryFactoryFor('sales', orderRepositoryGetter,);
    this.registerInclusionResolver('sales', this.sales.inclusionResolver);
    this.purchases = this.createHasManyRepositoryFactoryFor('purchases', orderRepositoryGetter,);
    this.registerInclusionResolver('purchases', this.purchases.inclusionResolver);
    this.products = this.createHasManyRepositoryFactoryFor('products', productRepositoryGetter,);
    this.registerInclusionResolver('products', this.products.inclusionResolver);
  }
}
