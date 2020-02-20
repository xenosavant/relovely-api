export interface UserList {
  id: string;
  profileImageUrl: string;
  username: string;
  firstName: string;
  lastName: string;
  type: string;
}

export const userListFields = {
  id: true, username: true, firstName: true, lastName:
    true, profileImageUrl: true
};

export const userDetailFields = {
  id: true, username: true, firstName: true, lastName:
    true, profileImageUrl: true, followers: true, following: true,
  sales: true, listings: true, favorites: true, type: true
};
