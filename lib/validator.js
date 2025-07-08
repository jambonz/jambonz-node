const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, './schema/app-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

/**
 * Gets the appropriate configuration from app.json based on the request path
 * @param {Object} params - Parameters object
 * @param {string} params.urlPath - The request path to match against
 * @param {string} params.appJsonPath - Path to app.json file
 * @returns {Object} - Result with { success: boolean, config: Object, error: string }
 */
function getAppConfig({ urlPath, appJsonPath }) {
  if (urlPath.length == 0 ) urlPath = "/";
  try {
    if (!appJsonPath) {
      return {
        success: false,
        config: {},
        error: 'appJsonPath is required'
      };
    }

    if (!fs.existsSync(appJsonPath)) {
      return {
        success: false,
        config: {},
        error: `app.json file not found at ${appJsonPath}`
      };
    }

    // Read and parse app.json
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    // Get regular (non-slash) properties
    const regularProperties = Object.entries(appJson)
      .filter(([key]) => !key.startsWith('/'))
      .reduce((acc, [key, value]) => {
        // If the property is marked as obscure, replace its value with asterisks
        if (value.obscure && value.value) {
          acc[key] = {
            ...value,
            value: '*'.repeat(value.value.length)
          };
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});

    // Check for a matching path property
    const pathProperty = appJson[urlPath];
    if (pathProperty) {
      // Combine path-specific properties with regular properties
      // Path-specific properties take precedence
      const mergedConfig = {
        ...regularProperties,
        ...pathProperty
      };

      // Handle obscure properties in path-specific config
      Object.entries(pathProperty).forEach(([key, value]) => {
        if (value.obscure && value.value) {
          mergedConfig[key] = {
            ...value,
            value: '*'.repeat(value.value.length)
          };
        }
      });

      return {
        success: true,
        config: mergedConfig,
        error: null
      };
    }

    // If no matching path property, return only the regular properties
    return {
      success: true,
      config: regularProperties,
      error: null
    };
  } catch (err) {
    return {
      success: false,
      config: {},
      error: `Error reading app.json: ${err.message}`
    };
  }
}

/**
 * Validates a jambonz application configuration against the schema
 * @param {Object} config - The configuration object to validate
 * @returns {Object} - Validation result with { isValid: boolean, errors: Array<string> }
 */
function validateAppConfig(config) {
  try {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);

    const validate = ajv.compile(schema);
    const errors = [];

    // Validate each property in the config
    Object.entries(config).forEach(([key, value]) => {
      if (key.startsWith('/')) {
        // For slash properties, validate each property within the path object
        Object.entries(value).forEach(([propKey, propValue]) => {
          const isValid = validate(propValue);
          if (!isValid) {
            errors.push(...validate.errors.map((err) => {
              const errPath = err.instancePath ?
                ` at path ${key}.${propKey}${err.instancePath}` : ` at path ${key}.${propKey}`;
              const message = err.message || 'Unknown error';
              const params = err.params ?
                ` (${Object.entries(err.params).map(([k, v]) => `${k}: ${v}`).join(', ')})` : '';
              return `${message}${errPath}${params}`;
            }));
          }
        });
      } else {
        // For non-slash properties, validate the property directly
        const isValid = validate(value);
        if (!isValid) {
          errors.push(...validate.errors.map((err) => {
            const errPath = err.instancePath ? ` at path ${key}${err.instancePath}` : ` at path ${key}`;
            const message = err.message || 'Unknown error';
            const params = err.params ?
              ` (${Object.entries(err.params).map(([k, v]) => `${k}: ${v}`).join(', ')})` : '';
            return `${message}${errPath}${params}`;
          }));
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (err) {
    return {
      isValid: false,
      errors: [`Error during validation: ${err.message}`]
    };
  }
}

const mergeEnvVarsWithDefaults = (env_vars, route, schema) => {
  env_vars = env_vars || {};
  const merged = {...env_vars};

  // First handle global properties (those not starting with /)
  Object.entries(schema).forEach(([propName, propSchema]) => {
    if (!propName.startsWith('/')) {
      if (!(propName in merged) && 'default' in propSchema) {
        merged[propName] = propSchema.default;
      }
    }
  });

  // Then handle route-specific properties
  const routeSchema = schema[route];
  if (!routeSchema) {
    return merged;
  }

  Object.entries(routeSchema).forEach(([propName, propSchema]) => {
    if (!(propName in merged) && 'default' in propSchema) {
      merged[propName] = propSchema.default;
    }
  });

  return merged;
};


module.exports = {
  validateAppConfig,
  getAppConfig,
  mergeEnvVarsWithDefaults,
  schema
};
