/**
 * Input validation utilities
 */

// Phone number validation - international format
// Accepts: +66812345678, +1234567890123 (7-15 digits after +)
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Validate and normalize phone number
 * @returns normalized phone or null if invalid
 */
export function validatePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // Remove spaces, dashes, parentheses
  let normalized = phone.replace(/[\s\-\(\)]/g, '').trim();
  
  // Add + if missing
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  // Validate format
  if (!PHONE_REGEX.test(normalized)) {
    return null;
  }
  
  return normalized;
}

/**
 * Check if phone is valid without normalizing
 */
export function isValidPhone(phone: string): boolean {
  return validatePhone(phone) !== null;
}

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  
  const normalized = email.toLowerCase().trim();
  
  if (!EMAIL_REGEX.test(normalized)) {
    return null;
  }
  
  // Check reasonable length
  if (normalized.length > 254) {
    return null;
  }
  
  return normalized;
}

export function isValidEmail(email: string): boolean {
  return validateEmail(email) !== null;
}

// Birthday validation (DD-MM format)
const BIRTHDAY_REGEX = /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])$/;

export function validateBirthday(birthday: string | null | undefined): string | null {
  if (!birthday) return null;
  
  const trimmed = birthday.trim();
  
  if (!BIRTHDAY_REGEX.test(trimmed)) {
    return null;
  }
  
  return trimmed;
}

// Amount validation (positive number)
export function validateAmount(amount: any): number | null {
  const num = parseFloat(amount);
  
  if (isNaN(num) || num <= 0 || num > 1000000) {
    return null;
  }
  
  return Math.round(num * 100) / 100; // 2 decimal places
}

// ID validation (positive integer)
export function validateId(id: any): number | null {
  const num = parseInt(id, 10);
  
  if (isNaN(num) || num <= 0) {
    return null;
  }
  
  return num;
}
