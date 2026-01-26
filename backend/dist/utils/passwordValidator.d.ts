export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Validates password strength according to security requirements
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export declare function validatePasswordStrength(password: string): PasswordValidationResult;
//# sourceMappingURL=passwordValidator.d.ts.map