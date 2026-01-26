"use strict";
// Input sanitization utility to prevent XSS and HTML injection
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeHtml = sanitizeHtml;
exports.sanitizeString = sanitizeString;
exports.sanitizeObject = sanitizeObject;
exports.sanitizeRequestBody = sanitizeRequestBody;
/**
 * Remove HTML tags and potentially dangerous characters from user input
 */
function sanitizeHtml(input) {
    if (!input)
        return null;
    // Remove HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');
    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>]/g, '');
    return sanitized.trim();
}
/**
 * Sanitize string input - removes HTML and dangerous characters
 */
function sanitizeString(input) {
    if (!input)
        return null;
    return sanitizeHtml(input);
}
/**
 * Sanitize object by recursively sanitizing all string values
 */
function sanitizeObject(obj) {
    if (typeof obj === 'string') {
        return sanitizeHtml(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
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
function sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') {
        return body;
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(body)) {
        // Skip sanitization for sensitive fields
        if (SKIP_SANITIZATION_FIELDS.some(field => key.toLowerCase().includes(field))) {
            sanitized[key] = value;
            continue;
        }
        // Sanitize string values
        if (typeof value === 'string') {
            sanitized[key] = sanitizeHtml(value);
        }
        else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => typeof item === 'string' ? sanitizeHtml(item) : item);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
//# sourceMappingURL=sanitize.js.map