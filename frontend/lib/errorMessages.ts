/**
 * User-friendly error messages for the Sarnies Loyalty App
 *
 * This module provides mappings from error codes to user-friendly messages
 * and helper functions for extracting messages from API errors.
 */

// Error codes mapped to user-friendly messages
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

  // Network errors
  'network_error': 'Unable to connect to the server. Please check your internet connection.',
  'timeout': 'The request took too long. Please try again.',

  // Generic errors
  'server_error': 'Something went wrong on our end. Please try again in a moment.',
  'validation_error': 'Please check your input and try again.',
  'not_found': 'The requested item could not be found.',
  'bad_request': 'We could not process your request. Please try again.',
  'service_unavailable': 'This service is temporarily unavailable. Please try again later.',
};

// Patterns that indicate technical errors that should be hidden
const TECHNICAL_PATTERNS = [
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /ENOTFOUND/i,
  /ERR_NETWORK/i,
  /database/i,
  /sql/i,
  /postgres/i,
  /relation.*does not exist/i,
  /column.*does not exist/i,
  /syntax error/i,
  /violates.*constraint/i,
  /null value/i,
  /stack trace/i,
  /at\s+\w+\s+\(/i,  // Stack trace pattern
  /internal server error/i,
];

/**
 * Get a user-friendly message for an error code
 */
export function getUserFriendlyMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['server_error'];
}

/**
 * Check if an error message contains technical details that should be hidden
 */
export function isTechnicalError(message: string): boolean {
  return TECHNICAL_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Extract user-friendly error message from an API error response
 */
export function getErrorMessage(error: any, defaultMessage?: string): string {
  const fallback = defaultMessage || 'Something went wrong. Please try again.';

  if (!error) return fallback;

  // Handle axios errors
  if (error.response?.data) {
    const data = error.response.data;

    // Prefer 'message' field (user-friendly)
    if (data.message && !isTechnicalError(data.message)) {
      return data.message;
    }

    // Try error code mapping
    if (data.error && ERROR_MESSAGES[data.error]) {
      return ERROR_MESSAGES[data.error];
    }

    // Use error string if it looks safe
    if (data.error && typeof data.error === 'string' && !isTechnicalError(data.error)) {
      // If the error is in our mapping, use the friendly version
      if (ERROR_MESSAGES[data.error]) {
        return ERROR_MESSAGES[data.error];
      }
      // Otherwise use the error string if it's not technical
      if (data.error.length < 200) {
        return data.error;
      }
    }
  }

  // Handle network errors
  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return ERROR_MESSAGES['network_error'];
  }

  // Handle status codes
  const status = error.response?.status;
  if (status) {
    switch (status) {
      case 401:
        return ERROR_MESSAGES['unauthorized'];
      case 403:
        return ERROR_MESSAGES['forbidden'];
      case 404:
        return ERROR_MESSAGES['not_found'];
      case 429:
        return ERROR_MESSAGES['rate_limit_exceeded'];
      case 500:
      case 502:
      case 503:
        return ERROR_MESSAGES['server_error'];
    }
  }

  // Check if error.message is safe to show
  if (error.message && typeof error.message === 'string') {
    if (!isTechnicalError(error.message) && error.message.length < 200) {
      return error.message;
    }
  }

  return fallback;
}

/**
 * Get specific error message for login failures
 */
export function getLoginErrorMessage(error: any): string {
  const errorCode = error.response?.data?.error;

  // Specific login error mappings
  if (errorCode === 'invalid_credentials') {
    return 'The email or password you entered is incorrect. Please double-check and try again.';
  }
  if (errorCode === 'account_locked') {
    return 'Your account has been temporarily locked after too many failed attempts. Please wait 15 minutes and try again, or contact support if you need immediate access.';
  }
  if (error.response?.status === 429) {
    return 'Too many login attempts. Please wait a few minutes before trying again.';
  }

  return getErrorMessage(error, 'Unable to log in. Please check your credentials and try again.');
}

/**
 * Get specific error message for OTP verification
 */
export function getOtpErrorMessage(error: any): string {
  const errorCode = error.response?.data?.error;

  if (errorCode === 'invalid_otp') {
    return 'The code you entered is incorrect. Please check and try again, or request a new code.';
  }
  if (errorCode === 'otp_expired') {
    return 'This code has expired. Please request a new verification code.';
  }
  if (errorCode === 'phone_not_registered') {
    return 'This phone number is not registered with Sarnies. Please visit a Sarnies location to sign up for the loyalty program.';
  }
  if (error.response?.status === 429) {
    return 'Too many verification attempts. Please wait a few minutes before trying again.';
  }

  return getErrorMessage(error, 'Unable to verify code. Please try again.');
}

/**
 * Get specific error message for voucher redemption
 */
export function getVoucherErrorMessage(error: any): string {
  const errorCode = error.response?.data?.error;

  if (errorCode === 'voucher_already_used') {
    return 'This voucher has already been redeemed and cannot be used again.';
  }
  if (errorCode === 'voucher_expired') {
    return 'This voucher has expired. Please check your other available vouchers.';
  }
  if (errorCode === 'insufficient_points') {
    return 'You do not have enough points to redeem this voucher. Keep earning points with your purchases!';
  }
  if (errorCode === 'voucher_not_found') {
    return 'This voucher is no longer available. It may have been removed or replaced.';
  }

  return getErrorMessage(error, 'Unable to process voucher. Please try again.');
}

export default {
  ERROR_MESSAGES,
  getUserFriendlyMessage,
  getErrorMessage,
  getLoginErrorMessage,
  getOtpErrorMessage,
  getVoucherErrorMessage,
  isTechnicalError,
};
