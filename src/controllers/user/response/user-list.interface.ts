export interface UserList {
  id: string;
  profileImageUrl: string;
  username: string;
  firstName: string;
  lastName: string;
}

export const userListFields = {
  id: true, username: true, firstName: true, lastName:
    true, profileImageUrl: true
};
