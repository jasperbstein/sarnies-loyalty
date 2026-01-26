"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBoolean = exports.validateEnum = exports.validateDate = exports.validateInteger = exports.validatePositiveNumber = exports.sanitizeString = exports.validatePagination = exports.validateIdParam = exports.validateOTP = exports.validateStrongPassword = exports.validatePassword = exports.validateEmail = exports.validatePhone = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : 'unknown',
                message: err.msg
            }))
        });
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
/**
 * Sanitize and validate phone number
 */
const validatePhone = () => [
    (0, express_validator_1.body)('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format (use E.164 format, e.g., +66812345678)')
        .customSanitizer((value) => {
        // Normalize to E.164 format
        let normalized = value.replace(/\s+/g, '').trim();
        if (!normalized.startsWith('+')) {
            normalized = '+' + normalized;
        }
        return normalized;
    })
];
exports.validatePhone = validatePhone;
/**
 * Sanitize and validate email
 */
const validateEmail = (fieldName = 'email', optional = false) => {
    const validator = (0, express_validator_1.body)(fieldName)
        .trim()
        .toLowerCase()
        .normalizeEmail();
    if (optional) {
        return [validator.optional({ checkFalsy: true }).isEmail().withMessage('Invalid email format')];
    }
    return [
        validator
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format')
    ];
};
exports.validateEmail = validateEmail;
/**
 * Validate password (for staff login)
 */
const validatePassword = () => [
    (0, express_validator_1.body)('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];
exports.validatePassword = validatePassword;
/**
 * Validate strong password (for registration/password change)
 */
const validateStrongPassword = () => [
    (0, express_validator_1.body)('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];
exports.validateStrongPassword = validateStrongPassword;
/**
 * Validate OTP
 */
const validateOTP = () => [
    (0, express_validator_1.body)('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
        .isNumeric().withMessage('OTP must contain only numbers')
];
exports.validateOTP = validateOTP;
/**
 * Validate ID parameter
 */
const validateIdParam = (paramName = 'id') => [
    (0, express_validator_1.param)(paramName)
        .isInt({ min: 1 }).withMessage(`${paramName} must be a positive integer`)
        .toInt()
];
exports.validateIdParam = validateIdParam;
/**
 * Validate pagination query parameters
 */
const validatePagination = () => [
    (0, express_validator_1.query)('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer')
        .toInt(),
    (0, express_validator_1.query)('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
        .toInt()
];
exports.validatePagination = validatePagination;
/**
 * Sanitize string input (remove HTML, trim)
 */
const sanitizeString = (fieldName, minLength, maxLength) => {
    let validator = (0, express_validator_1.body)(fieldName)
        .trim()
        .escape() // Escape HTML characters
        .notEmpty().withMessage(`${fieldName} is required`);
    if (minLength) {
        validator = validator.isLength({ min: minLength }).withMessage(`${fieldName} must be at least ${minLength} characters`);
    }
    if (maxLength) {
        validator = validator.isLength({ max: maxLength }).withMessage(`${fieldName} must be at most ${maxLength} characters`);
    }
    return validator;
};
exports.sanitizeString = sanitizeString;
/**
 * Validate positive number
 */
const validatePositiveNumber = (fieldName, optional = false) => {
    const validator = (0, express_validator_1.body)(fieldName);
    if (optional) {
        return validator
            .optional({ checkFalsy: true })
            .isFloat({ min: 0 }).withMessage(`${fieldName} must be a non-negative number`)
            .toFloat();
    }
    return validator
        .notEmpty().withMessage(`${fieldName} is required`)
        .isFloat({ min: 0 }).withMessage(`${fieldName} must be a non-negative number`)
        .toFloat();
};
exports.validatePositiveNumber = validatePositiveNumber;
/**
 * Validate integer
 */
const validateInteger = (fieldName, min, max, optional = false) => {
    let validator = (0, express_validator_1.body)(fieldName);
    if (optional) {
        validator = validator.optional({ checkFalsy: true });
    }
    else {
        validator = validator.notEmpty().withMessage(`${fieldName} is required`);
    }
    const constraints = {};
    if (min !== undefined)
        constraints.min = min;
    if (max !== undefined)
        constraints.max = max;
    let message = `${fieldName} must be an integer`;
    if (min !== undefined && max !== undefined) {
        message += ` between ${min} and ${max}`;
    }
    else if (min !== undefined) {
        message += ` greater than or equal to ${min}`;
    }
    else if (max !== undefined) {
        message += ` less than or equal to ${max}`;
    }
    return validator.isInt(constraints).withMessage(message).toInt();
};
exports.validateInteger = validateInteger;
/**
 * Validate date
 */
const validateDate = (fieldName, optional = false) => {
    const validator = (0, express_validator_1.body)(fieldName);
    if (optional) {
        return validator
            .optional({ checkFalsy: true })
            .isISO8601().withMessage(`${fieldName} must be a valid ISO 8601 date`)
            .toDate();
    }
    return validator
        .notEmpty().withMessage(`${fieldName} is required`)
        .isISO8601().withMessage(`${fieldName} must be a valid ISO 8601 date`)
        .toDate();
};
exports.validateDate = validateDate;
/**
 * Validate enum value
 */
const validateEnum = (fieldName, allowedValues, optional = false) => {
    const validator = (0, express_validator_1.body)(fieldName);
    if (optional) {
        return validator
            .optional({ checkFalsy: true })
            .isIn(allowedValues).withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }
    return validator
        .notEmpty().withMessage(`${fieldName} is required`)
        .isIn(allowedValues).withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
};
exports.validateEnum = validateEnum;
/**
 * Validate boolean
 */
const validateBoolean = (fieldName, optional = false) => {
    const validator = (0, express_validator_1.body)(fieldName);
    if (optional) {
        return validator
            .optional({ checkFalsy: true })
            .isBoolean().withMessage(`${fieldName} must be a boolean`)
            .toBoolean();
    }
    return validator
        .notEmpty().withMessage(`${fieldName} is required`)
        .isBoolean().withMessage(`${fieldName} must be a boolean`)
        .toBoolean();
};
exports.validateBoolean = validateBoolean;
//# sourceMappingURL=validation.js.map