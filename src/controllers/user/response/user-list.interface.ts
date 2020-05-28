export interface UserList {
  id: string;
  profileImageUrl: string;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
}

export const userDetailFields = {
  instagramUsername: false, passwordHash: false, instagramAuthToken:
    false, instagramUserId: false, signedInWithInstagram: false, signedInWithFacebook: false,
  facebookAuthToken: false, facebookUserId: false, emailVerificationCode: false,
  passwordVerificationCode: false
};

export const userListFields = {
  username: true,
  profileImageUrl: true,
  id: true,
  type: true
};
