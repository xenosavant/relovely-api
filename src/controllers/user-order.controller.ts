import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  param,
  patch,
  post,
  requestBody,
} from '@loopback/rest';
import {
  User,
  Order,
} from '../models';
import { UserRepository } from '../repositories';

export class UserOrderController {
  constructor(
    @repository(UserRepository) protected userRepository: UserRepository,
  ) { }

}
