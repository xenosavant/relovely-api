import { UserProfile } from "@loopback/security";

export interface AppUserProfile extends UserProfile {
  username?: string;
  id?: string;
}
