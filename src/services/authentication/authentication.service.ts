import { bind, /* inject, */ BindingScope } from '@loopback/core';

@bind({ scope: BindingScope.CONTEXT })
export class AuthenticationService {

  constructor() {

  }
}
