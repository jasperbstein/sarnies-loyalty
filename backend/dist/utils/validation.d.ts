/**
 * Input validation utilities
 */
/**
 * Validate and normalize phone number
 * @returns normalized phone or null if invalid
 */
export declare function validatePhone(phone: string | null | undefined): string | null;
/**
 * Check if phone is valid without normalizing
 */
export declare function isValidPhone(phone: string): boolean;
export declare function validateEmail(email: string | null | undefined): string | null;
export declare function isValidEmail(email: string): boolean;
export declare function validateBirthday(birthday: string | null | undefined): string | null;
export declare function validateAmount(amount: any): number | null;
export declare function validateId(id: any): number | null;
//# sourceMappingURL=validation.d.ts.map