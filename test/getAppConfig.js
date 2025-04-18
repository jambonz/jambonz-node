const test = require('tape');
const path = require('path');
const { getAppConfig } = require('../lib/validator');

test('getAppConfig tests', (t) => {
  // Test case 1: Missing appJsonPath
  t.test('should return error when appJsonPath is missing', (st) => {
    const result = getAppConfig({ urlPath: '/test' });
    st.equal(result.success, false, 'should not be successful');
    st.equal(result.error, 'appJsonPath is required', 'should return correct error message');
    st.end();
  });

  // Test case 2: Non-existent app.json file
  t.test('should return error when app.json does not exist', (st) => {
    const result = getAppConfig({ 
      urlPath: '/test',
      appJsonPath: path.join(__dirname, 'data/nonexistent.json')
    });
    st.equal(result.success, false, 'should not be successful');
    st.ok(result.error.includes('app.json file not found'), 'should return file not found error');
    st.end();
  });

  // Test case 3: Valid app.json with regular properties
  t.test('should return regular properties when no path match', (st) => {
    const result = getAppConfig({ 
      urlPath: '/nonexistent',
      appJsonPath: path.join(__dirname, 'data/valid/non-slash.json')
    });
    st.equal(result.success, true, 'should be successful');
    st.deepEqual(result.config, {
      text: {
        description: 'Welcome message',
        type: 'string',
        required: true
      }
    }, 'should return correct regular properties');
    st.end();
  });

  // Test case 4: Valid app.json with path-specific properties
  t.test('should return path-specific properties when path matches', (st) => {
    const result = getAppConfig({ 
      urlPath: '/hello',
      appJsonPath: path.join(__dirname, 'data/valid/slash.json')
    });
    st.equal(result.success, true, 'should be successful');
    st.deepEqual(result.config, {
      '/hello': {
        text: {
          description: 'Welcome message',
          type: 'string',
          required: true
        }
      }
    }, 'should return correct path-specific properties');
    st.end();
  });

  // Test case 5: Valid app.json with mixed properties
  t.test('should merge regular and path-specific properties', (st) => {
    const result = getAppConfig({ 
      urlPath: '/hello',
      appJsonPath: path.join(__dirname, 'data/valid/mixed.json')
    });
    st.equal(result.success, true, 'should be successful');
    st.deepEqual(result.config, {
      text: {
        type: 'string'
      },
      '/hello': {
        text: {
          description: 'Welcome message',
          type: 'string',
          required: true
        }
      }
    }, 'should return merged properties');
    st.end();
  });

  // Test case 6: Obscure property handling
  t.test('should obscure values when obscure flag is true', (st) => {
    const result = getAppConfig({ 
      urlPath: '/hello',
      appJsonPath: path.join(__dirname, 'data/valid/obscure.json')
    });
    st.equal(result.success, true, 'should be successful');
    st.deepEqual(result.config, {
      apiKey: {
        description: 'API key for the service',
        type: 'string',
        required: true,
        obscure: true,
        value: '********'
      },
      '/hello': {
        text: {
          description: 'Welcome message',
          type: 'string',
          required: true
        }
      }
    }, 'should obscure sensitive values');
    st.end();
  });

  t.end();
}); 