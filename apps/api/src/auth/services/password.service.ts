import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  /**
   * Hashes a password using Argon2id with OWASP-recommended parameters.
   *
   * @param password Plaintext password string
   * @returns Argon2id password hash string
   */
  async hash(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3, // 3 iterations
        parallelism: 4, // 4 threads
      });
    } catch (error) {
      this.logger.error('Failed to hash password securely', error);
      const err = new Error('Password hashing failed');
      (err as { cause?: unknown }).cause = error;
      throw err;
    }
  }

  /**
   * Compares a plaintext password against a stored Argon2id hash.
   *
   * @param hash Stored Argon2id hash
   * @param plain Plaintext password provided by user
   * @returns true if password matches, false otherwise
   */
  async compare(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // Argon2 throws if hash format is corrupted or invalid; return false safely
      return false;
    }
  }
}
