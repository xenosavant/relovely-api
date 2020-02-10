import { genSalt, hash } from 'bcrypt';
import { compare } from 'bcrypt';
import { inject } from '@loopback/core';

/**
 * Service HashPassword using module 'bcryptjs'.
 * It takes in a plain password, generates a salt with given
 * round and returns the hashed password as a string
 */
export type HashPassword = (
  password: string,
  rounds: number,
) => Promise<string>;
// bind function to `services.bcryptjs.HashPassword`
export async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  return hash(password, salt);
}

export interface PasswordHasher<T = string> {
  hashPassword(password: T): Promise<T>;
  comparePassword(providedPass: T, storedPass: T): Promise<boolean>;
}

export class BcryptHasher implements PasswordHasher<string> {

  private readonly rounds: number = 10000;

  constructor() { }

  async hashPassword(password: string): Promise<string> {
    return hash(password, this.rounds);
  }

  async comparePassword(
    providedPass: string,
    storedPass: string,
  ): Promise<boolean> {
    const passwordIsMatched = await compare(providedPass, storedPass);
    return passwordIsMatched;
  }


}
