// Quick test for password validation
const passwords = [
  { value: 'weak', expected: 'fail' },
  { value: 'Weak123', expected: 'fail' },
  { value: 'WeakPass', expected: 'fail' },
  { value: 'weakpass123!', expected: 'fail' },
  { value: 'WEAKPASS123!', expected: 'fail' },
  { value: 'WeakPass123', expected: 'fail' },
  { value: 'Weak@123', expected: 'pass' },
  { value: 'StrongP@ss123', expected: 'pass' },
  { value: 'Secure#Pass2024', expected: 'pass' }
];

function validatePasswordStrength(password) {
  const errors = [];

  if (!password) {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

console.log('\n=== Password Validation Tests ===\n');

let passed = 0;
let failed = 0;

passwords.forEach(test => {
  const result = validatePasswordStrength(test.value);
  const actualResult = result.valid ? 'pass' : 'fail';
  const success = actualResult === test.expected;

  if (success) {
    passed++;
    console.log(`✅ "${test.value}" - ${actualResult} (${result.errors.length} errors)`);
  } else {
    failed++;
    console.log(`❌ "${test.value}" - Expected: ${test.expected}, Got: ${actualResult}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
  }
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
