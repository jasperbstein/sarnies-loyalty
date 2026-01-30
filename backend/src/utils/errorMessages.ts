/**
 * User-friendly error messages for the Sarnies Loyalty API
 *
 * This module provides:
 * 1. Human-readable error messages for common error scenarios
 * 2. Error code mapping to user-friendly messages
 * 3. Functions to sanitize technical errors before sending to clients
 */

// Error codes and their user-friendly messages
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  'invalid_credentials': 'The email or password you entered is incorrect. Please try again.',
  'account_locked': 'Your account has been temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
  'invalid_otp': 'The verification code is incorrect or has expired. Please request a new code.',
  'otp_expired': 'This verification code has expired. Please request a new one.',
  'token_expired': 'Your session has expired. Please log in again.',
  'token_invalid': 'Your session is no longer valid. Please log in again.',
  'unauthorized': 'Please log in to continue.',
  'forbidden': 'You do not have permission to perform this action.',
  'email_not_registered': 'This email address is not registered. Please check the email or contact support.',
  'phone_not_registered': 'This phone number is not registered. Please contact Sarnies to register.',
  'magic_link_expired': 'This login link has expired. Please request a new one.',
  'magic_link_invalid': 'This login link is invalid or has already been used.',
  'verification_token_expired': 'This verification link has expired. Please request a new one.',
  'verification_token_invalid': 'This verification link is invalid. Please request a new one.',

  // Registration errors
  'email_already_exists': 'An account with this email already exists. Please log in instead.',
  'phone_already_exists': 'An account with this phone number already exists. Please log in instead.',
  'password_too_weak': 'Please choose a stronger password. It should be at least 8 characters with a mix of letters and numbers.',
  'invalid_email_format': 'Please enter a valid email address.',
  'invalid_phone_format': 'Please enter a valid Thai phone number (+66xxxxxxxxx).',
  'email_domain_not_allowed': 'This email domain is not authorized for registration.',
  'registration_incomplete': 'Please complete your registration first.',

  // Transaction errors
  'insufficient_points': 'You do not have enough points for this redemption.',
  'voucher_not_found': 'This voucher could not be found. It may have been removed.',
  'voucher_expired': 'This voucher has expired and can no longer be used.',
  'voucher_already_used': 'This voucher has already been redeemed.',
  'voucher_not_available': 'This voucher is currently not available.',
  'invalid_amount': 'Please enter a valid purchase amount.',
  'transaction_failed': 'We could not process your transaction. Please try again.',
  'customer_not_found': 'Customer not found. Please verify the phone number or member ID.',

  // QR code errors
  'qr_invalid': 'This QR code is invalid or corrupted. Please try scanning again.',
  'qr_expired': 'This QR code has expired. Please generate a new one.',
  'qr_already_used': 'This QR code has already been used.',

  // Rate limiting
  'rate_limit_exceeded': 'Too many attempts. Please wait a moment and try again.',
  'otp_rate_limit': 'Please wait before requesting another verification code.',

  // POS Integration errors
  'missing_api_key': 'API key is required. Please include your API key in the request.',
  'invalid_api_key': 'The API key provided is invalid.',
  'api_key_revoked': 'This API key has been deactivated. Please contact support.',
  'missing_customer_identifier': 'Customer phone number or member ID is required.',
  'missing_transaction_id': 'Transaction ID is required for tracking.',
  'duplicate_transaction': 'This transaction has already been processed.',

  // Generic errors
  'server_error': 'Something went wrong on our end. Please try again in a moment.',
  'network_error': 'Unable to connect to the server. Please check your internet connection.',
  'validation_error': 'Please check your input and try again.',
  'not_found': 'The requested item could not be found.',
  'bad_request': 'We could not process your request. Please try again.',
  'service_unavailable': 'This service is temporarily unavailable. Please try again later.',
};

// Database error codes mapped to user-friendly messages
const DB_ERROR_MAP: Record<string, string> = {
  '23505': 'This record already exists.',  // Unique violation
  '23503': 'This action cannot be completed due to related records.',  // Foreign key violation
  '23502': 'Required information is missing.',  // Not null violation
  '22P02': 'Invalid data format provided.',  // Invalid text representation
  'ECONNREFUSED': 'Service temporarily unavailable. Please try again.',
  'ETIMEDOUT': 'The request took too long. Please try again.',
  'ENOTFOUND': 'Service temporarily unavailable. Please try again.',
};

/**
 * Get a user-friendly error message for a given error code
 */
export function getUserFriendlyMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['server_error'];
}

/**
 * Check if an error is a database-related error
 */
export function isDatabaseError(error: any): boolean {
  if (!error) return false;

  // PostgreSQL error codes are strings of length 5
  if (error.code && typeof error.code === 'string') {
    if (error.code.length === 5 || DB_ERROR_MAP[error.code]) {
      return true;
    }
  }

  // Check for connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  return false;
}

/**
 * Sanitize database errors to prevent leaking technical details
 */
export function sanitizeDatabaseError(error: any): string {
  if (!error) return ERROR_MESSAGES['server_error'];

  // Check if it's a known DB error code
  if (error.code && DB_ERROR_MAP[error.code]) {
    return DB_ERROR_MAP[error.code];
  }

  // Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return 'Service temporarily unavailable. Please try again in a moment.';
  }

  // Default to generic server error
  return ERROR_MESSAGES['server_error'];
}

/**
 * Create a standardized error response object
 */
export function createErrorResponse(
  errorCode: string,
  customMessage?: string,
  details?: any
): { error: string; code: string; message: string; details?: any } {
  const message = customMessage || getUserFriendlyMessage(errorCode);

  const response: any = {
    error: errorCode,
    code: errorCode,
    message: message,
  };

  // Only include details in development
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }

  return response;
}

/**
 * Sanitize any error for safe client response
 * This prevents technical details from leaking to users
 */
export function sanitizeErrorForClient(error: any, defaultMessage?: string): string {
  // If it's already a user-friendly message we created
  if (typeof error === 'string' && ERROR_MESSAGES[error]) {
    return ERROR_MESSAGES[error];
  }

  // If it's a known error code
  if (error?.error && ERROR_MESSAGES[error.error]) {
    return ERROR_MESSAGES[error.error];
  }

  // Check for database errors
  if (isDatabaseError(error)) {
    return sanitizeDatabaseError(error);
  }

  // Check for specific error patterns that should be hidden
  const technicalPatterns = [
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /ENOTFOUND/i,
    /database/i,
    /sql/i,
    /postgres/i,
    /relation.*does not exist/i,
    /column.*does not exist/i,
    /syntax error/i,
    /violates.*constraint/i,
    /null value/i,
    /invalid input/i,
    /permission denied/i,
    /authentication failed/i,
    /connection refused/i,
    /stack trace/i,
    /at\s+\w+\s+\(/i,  // Stack trace pattern
  ];

  const errorMessage = error?.message || error?.toString() || '';

  for (const pattern of technicalPatterns) {
    if (pattern.test(errorMessage)) {
      return defaultMessage || ERROR_MESSAGES['server_error'];
    }
  }

  // If the error message seems safe (no technical details), return it
  // But only if it's reasonably short (not a stack trace)
  if (errorMessage.length > 0 && errorMessage.length < 200) {
    return errorMessage;
  }

  return defaultMessage || ERROR_MESSAGES['server_error'];
}

/**
 * Log error for server-side debugging while returning safe message
 */
export function handleAndLogError(
  context: string,
  error: any,
  defaultMessage?: string
): string {
  // Log full error details for debugging
  console.error(`[${context}] Error:`, error);

  // Return sanitized message for client
  return sanitizeErrorForClient(error, defaultMessage);
}

export default {
  ERROR_MESSAGES,
  getUserFriendlyMessage,
  isDatabaseError,
  sanitizeDatabaseError,
  createErrorResponse,
  sanitizeErrorForClient,
  handleAndLogError,
};
