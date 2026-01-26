"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordStrength = validatePasswordStrength;
/**
 * Validates password strength according to security requirements
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
function validatePasswordStrength(password) {
    const errors = [];
    if (!password) {
        return {
            valid: false,
            errors: ['Password is required']
        };
    }
    // Minimum length check
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    // Uppercase letter check
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    // Lowercase letter check
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    // Number check
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    // Special character check
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
//# sourceMappingURL=passwordValidator.js.map