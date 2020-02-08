import { post, getModelSchemaRef, requestBody } from "@loopback/rest";
import { User } from "../../models";
import { repository } from "@loopback/repository";
import { UserRepository } from "../../repositories";
import { InstagramSignupRequest } from './request/instagram-signup-request.interface';
import { InstagramService } from "../../services";
import { service } from "@loopback/core";

// Uncomment these imports to begin using these cool features!

// import {inject} from '@loopback/context';


export class InstagramController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @service(InstagramService)
    public instagramService: InstagramService) { }

  @post('/instagram/signup', {
    responses: {
      '200': {
        description: 'User model instance',
        content: { 'application/json': { schema: getModelSchemaRef(User) } },
      },
    },
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(InstagramSignupRequest),
        },
      },
    })
    request: InstagramSignupRequest,
  ): Promise<User> {

    const authResponse = await this.instagramService.getAccessToken(request.code);
    const data = await this.instagramService.getBasicUserData(authResponse.access_token);
    const profile = await this.instagramService.getUserProfile(data.username);
    return this.userRepository.create({
      username: data.username,
      profileImageUrl: profile.graphql.user.profile_pic_url_hd,
      isSeller: false,
      following: [],
      favorites: []
    });
  }
}
