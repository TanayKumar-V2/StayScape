import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  it('should be defined', () => {
    expect(passwordService).toBeDefined();
  });

  it('should hash password and not store plaintext', async () => {
    const password = 'SuperSecurePassphrase123!';
    const hash = await passwordService.hash(password);

    expect(hash).toBeDefined();
    expect(hash).not.toEqual(password);
    expect(hash).toContain('$argon2id$');
  });

  it('should verify correct password successfully', async () => {
    const password = 'CorrectPassword123#';
    const hash = await passwordService.hash(password);

    const isValid = await passwordService.compare(hash, password);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'CorrectPassword123#';
    const hash = await passwordService.hash(password);

    const isValid = await passwordService.compare(hash, 'WrongPassword456$');
    expect(isValid).toBe(false);
  });

  it('should support long passphrases up to 128 characters', async () => {
    const longPassphrase =
      'This-is-a-very-long-passphrase-with-lots-of-entropy-and-special-characters-that-exceeds-standard-lengths-and-remains-valid-1234567890!';
    expect(longPassphrase.length).toBeGreaterThan(100);

    const hash = await passwordService.hash(longPassphrase);
    expect(await passwordService.compare(hash, longPassphrase)).toBe(true);
  });
});
