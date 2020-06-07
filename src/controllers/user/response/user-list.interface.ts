export interface UserList {
  id: string;
  profileImageUrl: string;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
}

export const userDetailFields = {
  passwordHash: false, instagramAuthToken:
    false, instagramUserId: false, signedInWithInstagram: false,
  facebookAuthToken: false, emailVerificationCode: false,
  passwordVerificationCode: false
};

export const userListFields = {
  username: true,
  profileImageUrl: true,
  id: true,
  type: true
};
