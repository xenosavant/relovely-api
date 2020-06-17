import {
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  ValueOrPromise,
} from '@loopback/core';
import { juggler } from '@loopback/repository';

@lifeCycleObserver('datasource')
export class DbDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'db';

  constructor(
    @inject('datasources.config.db', { optional: true })
    dsConfig: object = {
      name: 'db',
      connector: 'mongodb',
      url: process.env.CONNECTION_STRING,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: 'relovely',
      useNewUrlParser: true,
      allowExtendedOperators: true
    },
  ) {
    super(dsConfig);
  }

  /**
   * Start the datasource when application is started
   */
  start(): ValueOrPromise<void> {
    // Add your logic here to be invoked when the application is started
  }

  /**
   * Disconnect the datasource when application is stopped. This allows the
   * application to be shut down gracefully.
   */
  stop(): ValueOrPromise<void> {
    return super.disconnect();
  }
}
