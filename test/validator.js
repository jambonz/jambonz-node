const test = require('tape');
const { validateAppConfig } = require('../lib/validator');
const fs = require('fs');
const path = require('path');

// Load test data
const loadTestData = (category, name) => {
  const filePath = path.join(__dirname, 'data', category, `${name}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

test('App Config Validator', (t) => {
  t.test('Valid Cases', (t) => {
    // Test valid non-slash properties
    const validNonSlash = loadTestData('valid', 'non-slash');
    let result = validateAppConfig(validNonSlash);
    t.ok(result.isValid, 'valid non-slash properties pass validation');
    t.equal(result.errors.length, 0, 'no errors for valid non-slash properties');

    // Test valid slash properties
    const validSlash = loadTestData('valid', 'slash');
    result = validateAppConfig(validSlash);
    t.ok(result.isValid, 'valid slash properties pass validation');
    t.equal(result.errors.length, 0, 'no errors for valid slash properties');

    // Test valid mixed properties
    const validMixed = loadTestData('valid', 'mixed');
    result = validateAppConfig(validMixed);
    t.ok(result.isValid, 'valid mixed properties pass validation');
    t.equal(result.errors.length, 0, 'no errors for valid mixed properties');

    t.end();
  });

  t.test('Invalid Cases', (t) => {
    // Test invalid non-slash properties
    const invalidNonSlash = loadTestData('invalid', 'non-slash');
    let result = validateAppConfig(invalidNonSlash);
    t.notOk(result.isValid, 'invalid non-slash properties fail validation');
    t.ok(result.errors.length > 0, 'errors reported for invalid non-slash properties');

    // Test invalid slash properties
    const invalidSlash = loadTestData('invalid', 'slash');
    result = validateAppConfig(invalidSlash);
    t.notOk(result.isValid, 'invalid slash properties fail validation');
    t.ok(result.errors.length > 0, 'errors reported for invalid slash properties');

    // Test invalid mixed properties
    const invalidMixed = loadTestData('invalid', 'mixed');
    result = validateAppConfig(invalidMixed);
    t.notOk(result.isValid, 'invalid mixed properties fail validation');
    t.ok(result.errors.length > 0, 'errors reported for invalid mixed properties');

    // Test missing description
    const missingDescription = loadTestData('invalid', 'missing-description');
    result = validateAppConfig(missingDescription);
    t.notOk(result.isValid, 'properties without description fail validation');
    t.ok(result.errors.some(err => err.includes('description')), 'error message mentions missing description');

    t.end();
  });

  t.end();
}); 