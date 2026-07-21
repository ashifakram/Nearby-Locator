/**
 * PasswordPolicy (Domain Service)
 * Pure, stateless password quality enforcement.
 * No IO. No hashing. No side effects.
 * Called before bcrypt.hash() to avoid wasting CPU on invalid inputs.
 */
export const PasswordPolicy = {
  /**
   * Validates a raw password against the system password policy.
   * @param {string} rawPassword
   * @returns {{ valid: boolean, message?: string }}
   */
  validate(rawPassword) {
    if (!rawPassword || typeof rawPassword !== 'string') {
      return { valid: false, message: 'Password must be a non-empty string.' };
    }

    if (rawPassword.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long.' };
    }

    if (rawPassword.length > 128) {
      return { valid: false, message: 'Password must not exceed 128 characters.' };
    }

    if (!/[a-z]/.test(rawPassword)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter.' };
    }

    if (!/[A-Z]/.test(rawPassword)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }

    if (!/[0-9]/.test(rawPassword)) {
      return { valid: false, message: 'Password must contain at least one number.' };
    }

    return { valid: true };
  }
};
