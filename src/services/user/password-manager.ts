export interface PasswordManager {
  hashPassword(password: string, salt: string): Promise<string>;
  verifyPassword(hash: string, password: string, salt: string): Promise<boolean>
}
