export interface UserList {
  id: string;
  profileImageUrl: string;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
}

export const userAuthFields = {
  passwordHash: false, instagramAuthToken:
    false, instagramUserId: false,
  facebookAuthToken: false, emailVerificationCode: false,
  passwordVerificationCode: false
};

export const userDetailFields = {
  passwordHash: false, instagramAuthToken:
    false, instagramUserId: false,
  facebookAuthToken: false, emailVerificationCode: false,
  passwordVerificationCode: false, cards: false, addresses: false,
  preferences: false, stripeCustomerId: false, email: false, seller: false
};

export const userListFields = {
  username: true,
  profileImageUrl: true,
  id: true,
  type: true
};
