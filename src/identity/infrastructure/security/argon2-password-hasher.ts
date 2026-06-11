import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PasswordHasher } from '../../domain/ports/password-hasher';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(value: string): Promise<string> {
    return argon2.hash(value);
  }

  verify(hash: string, value: string): Promise<boolean> {
    return argon2.verify(hash, value);
  }
}

