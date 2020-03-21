import { bind, /* inject, */ BindingScope } from '@loopback/core';

@bind({ scope: BindingScope.TRANSIENT })
export class CloudinaryService {
  constructor(/* Add @inject to inject parameters */) { }


}
