// Form validation utilities

export interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number') return true;
      if (Array.isArray(value)) return value.length > 0;
      return !!value;
    },
    message,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Only validate if value exists
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      // Supports formats: +66999999999, 0999999999, +1-555-555-5555
      const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
      return phoneRegex.test(value.replace(/\s/g, ''));
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return value.length <= max;
    },
    message: message || `Must be at most ${max} characters`,
  }),

  min: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === '' || value === null || value === undefined) return true;
      return Number(value) >= min;
    },
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === '' || value === null || value === undefined) return true;
      return Number(value) <= max;
    },
    message: message || `Must be at most ${max}`,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return regex.test(value);
    },
    message,
  }),

  oneOf: (options: any[], message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return options.includes(value);
    },
    message: message || `Must be one of: ${options.join(', ')}`,
  }),

  custom: (validator: (value: any) => boolean, message: string): ValidationRule => ({
    validate: validator,
    message,
  }),
};

// Validate a single field
export function validateField(value: any, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Validate multiple fields
export function validateForm<T extends Record<string, any>>(
  values: T,
  rules: Partial<Record<keyof T, ValidationRule[]>>
): { valid: boolean; errors: Partial<Record<keyof T, string[]>> } {
  const errors: Partial<Record<keyof T, string[]>> = {};
  let valid = true;

  for (const key in rules) {
    const fieldRules = rules[key];
    if (fieldRules) {
      const result = validateField(values[key], fieldRules);
      if (!result.valid) {
        errors[key] = result.errors;
        valid = false;
      }
    }
  }

  return { valid, errors };
}

// Hook-friendly validation helper
export function useValidation<T extends Record<string, any>>(
  rules: Partial<Record<keyof T, ValidationRule[]>>
) {
  return {
    validateField: (name: keyof T, value: any) => {
      const fieldRules = rules[name];
      if (!fieldRules) return { valid: true, errors: [] };
      return validateField(value, fieldRules);
    },
    validateForm: (values: T) => validateForm(values, rules),
  };
}
