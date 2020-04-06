export interface UserList {
  id: string;
  profileImageUrl: string;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
}

export const userDetailFields = {
  email: false, instagramUsername: false, passwordHash: false, instagramAuthToken:
    false, instagramUserId: false, signedInWithInstagram: false, signedInWithFacebook: false,
  facebookAuthToken: false, facebookUserId: false, emailVerificationCode: false,
  passwordVerificationCode: false
};

export const userListFields = {
  ...userDetailFields,
  email: false,
  firstName: false,
  lastName: false,
  followers: false,
  following: false,
  favorites: false
};
