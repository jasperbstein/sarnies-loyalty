"use strict";
/**
 * Input validation utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePhone = validatePhone;
exports.isValidPhone = isValidPhone;
exports.validateEmail = validateEmail;
exports.isValidEmail = isValidEmail;
exports.validateBirthday = validateBirthday;
exports.validateAmount = validateAmount;
exports.validateId = validateId;
// Phone number validation - international format
// Accepts: +66812345678, +1234567890123 (7-15 digits after +)
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
/**
 * Validate and normalize phone number
 * @returns normalized phone or null if invalid
 */
function validatePhone(phone) {
    if (!phone)
        return null;
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
function isValidPhone(phone) {
    return validatePhone(phone) !== null;
}
// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateEmail(email) {
    if (!email)
        return null;
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
function isValidEmail(email) {
    return validateEmail(email) !== null;
}
// Birthday validation (DD-MM format)
const BIRTHDAY_REGEX = /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])$/;
function validateBirthday(birthday) {
    if (!birthday)
        return null;
    const trimmed = birthday.trim();
    if (!BIRTHDAY_REGEX.test(trimmed)) {
        return null;
    }
    return trimmed;
}
// Amount validation (positive number)
function validateAmount(amount) {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || num > 1000000) {
        return null;
    }
    return Math.round(num * 100) / 100; // 2 decimal places
}
// ID validation (positive integer)
function validateId(id) {
    const num = parseInt(id, 10);
    if (isNaN(num) || num <= 0) {
        return null;
    }
    return num;
}
//# sourceMappingURL=validation.js.map