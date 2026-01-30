// Input sanitization utility to prevent XSS and HTML injection

/**
 * Remove HTML tags and potentially dangerous characters from user input
 */
export function sanitizeHtml(input: string | null | undefined): string | null {
  if (!input) return null;

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');

  return sanitized.trim();
}

/**
 * Sanitize string input - removes HTML and dangerous characters
 */
export function sanitizeString(input: string | null | undefined): string | null {
  if (!input) return null;
  return sanitizeHtml(input);
}

/**
 * Sanitize object by recursively sanitizing all string values
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeHtml(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * List of fields that should never be sanitized (passwords, tokens, etc)
 */
const SKIP_SANITIZATION_FIELDS = [
  'password',
  'password_hash',
  'token',
  'otp',
  'otp_code',
  'api_key',
  'secret'
];

/**
 * Sanitize request body, skipping sensitive fields
 */
export function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(body)) {
    // Skip sanitization for sensitive fields
    if (SKIP_SANITIZATION_FIELDS.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = value;
      continue;
    }

    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeHtml(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
