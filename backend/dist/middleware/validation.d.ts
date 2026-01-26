import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to handle validation errors
 */
export declare const handleValidationErrors: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Sanitize and validate phone number
 */
export declare const validatePhone: () => import("express-validator").ValidationChain[];
/**
 * Sanitize and validate email
 */
export declare const validateEmail: (fieldName?: string, optional?: boolean) => import("express-validator").ValidationChain[];
/**
 * Validate password (for staff login)
 */
export declare const validatePassword: () => import("express-validator").ValidationChain[];
/**
 * Validate strong password (for registration/password change)
 */
export declare const validateStrongPassword: () => import("express-validator").ValidationChain[];
/**
 * Validate OTP
 */
export declare const validateOTP: () => import("express-validator").ValidationChain[];
/**
 * Validate ID parameter
 */
export declare const validateIdParam: (paramName?: string) => import("express-validator").ValidationChain[];
/**
 * Validate pagination query parameters
 */
export declare const validatePagination: () => import("express-validator").ValidationChain[];
/**
 * Sanitize string input (remove HTML, trim)
 */
export declare const sanitizeString: (fieldName: string, minLength?: number, maxLength?: number) => import("express-validator").ValidationChain;
/**
 * Validate positive number
 */
export declare const validatePositiveNumber: (fieldName: string, optional?: boolean) => import("express-validator").ValidationChain;
/**
 * Validate integer
 */
export declare const validateInteger: (fieldName: string, min?: number, max?: number, optional?: boolean) => import("express-validator").ValidationChain;
/**
 * Validate date
 */
export declare const validateDate: (fieldName: string, optional?: boolean) => import("express-validator").ValidationChain;
/**
 * Validate enum value
 */
export declare const validateEnum: (fieldName: string, allowedValues: string[], optional?: boolean) => import("express-validator").ValidationChain;
/**
 * Validate boolean
 */
export declare const validateBoolean: (fieldName: string, optional?: boolean) => import("express-validator").ValidationChain;
//# sourceMappingURL=validation.d.ts.map