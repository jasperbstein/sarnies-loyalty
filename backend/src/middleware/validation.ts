import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
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

/**
 * Sanitize and validate phone number
 */
export const validatePhone = () => [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format (use E.164 format, e.g., +66812345678)')
    .customSanitizer((value: string) => {
      // Normalize to E.164 format
      let normalized = value.replace(/\s+/g, '').trim();
      if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
      }
      return normalized;
    })
];

/**
 * Sanitize and validate email
 */
export const validateEmail = (fieldName: string = 'email', optional: boolean = false) => {
  const validator = body(fieldName)
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

/**
 * Validate password (for staff login)
 */
export const validatePassword = () => [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

/**
 * Validate strong password (for registration/password change)
 */
export const validateStrongPassword = () => [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

/**
 * Validate OTP
 */
export const validateOTP = () => [
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers')
];

/**
 * Validate ID parameter
 */
export const validateIdParam = (paramName: string = 'id') => [
  param(paramName)
    .isInt({ min: 1 }).withMessage(`${paramName} must be a positive integer`)
    .toInt()
];

/**
 * Validate pagination query parameters
 */
export const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt()
];

/**
 * Sanitize string input (remove HTML, trim)
 */
export const sanitizeString = (fieldName: string, minLength?: number, maxLength?: number) => {
  let validator = body(fieldName)
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

/**
 * Validate positive number
 */
export const validatePositiveNumber = (fieldName: string, optional: boolean = false) => {
  const validator = body(fieldName);

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

/**
 * Validate integer
 */
export const validateInteger = (fieldName: string, min?: number, max?: number, optional: boolean = false) => {
  let validator = body(fieldName);

  if (optional) {
    validator = validator.optional({ checkFalsy: true });
  } else {
    validator = validator.notEmpty().withMessage(`${fieldName} is required`);
  }

  const constraints: { min?: number; max?: number } = {};
  if (min !== undefined) constraints.min = min;
  if (max !== undefined) constraints.max = max;

  let message = `${fieldName} must be an integer`;
  if (min !== undefined && max !== undefined) {
    message += ` between ${min} and ${max}`;
  } else if (min !== undefined) {
    message += ` greater than or equal to ${min}`;
  } else if (max !== undefined) {
    message += ` less than or equal to ${max}`;
  }

  return validator.isInt(constraints).withMessage(message).toInt();
};

/**
 * Validate date
 */
export const validateDate = (fieldName: string, optional: boolean = false) => {
  const validator = body(fieldName);

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

/**
 * Validate enum value
 */
export const validateEnum = (fieldName: string, allowedValues: string[], optional: boolean = false) => {
  const validator = body(fieldName);

  if (optional) {
    return validator
      .optional({ checkFalsy: true })
      .isIn(allowedValues).withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return validator
    .notEmpty().withMessage(`${fieldName} is required`)
    .isIn(allowedValues).withMessage(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
};

/**
 * Validate boolean
 */
export const validateBoolean = (fieldName: string, optional: boolean = false) => {
  const validator = body(fieldName);

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
