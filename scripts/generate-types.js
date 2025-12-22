/**
 * Generates TypeScript type declarations from:
 * 1. @jambonz/verb-specifications specs - Webhook verb types
 * 2. calls.yaml + platform.yaml - REST API types (official jambonz API docs)
 *
 * Run with: node scripts/generate-types.js
 *
 */

const { readFileSync, writeFileSync, mkdirSync, existsSync } = require('fs');
const { resolve } = require('path');
const { parse: parseYaml } = require('yaml');

// Load specs from @jambonz/verb-specifications (webhook verbs)
const { specs } = require('@jambonz/verb-specifications');

// Load OpenAPI specs (REST API) - combine calls.yaml and platform.yaml
const callsYamlPath = resolve(__dirname, '../schema/calls.yaml');
const platformYamlPath = resolve(__dirname, '../schema/platform.yaml');

let openapi = null;

function loadAndMergeOpenAPISpecs() {
  const callsExists = existsSync(callsYamlPath);
  const platformExists = existsSync(platformYamlPath);

  if (!callsExists && !platformExists) {
    console.log('⚠ No calls.yaml or platform.yaml found, REST API types will use fallback definitions');
    return null;
  }

  // Start with empty merged spec
  const merged = {
    openapi: '3.0.0',
    info: { title: 'Jambonz API', version: '1.0.0' },
    paths: {},
    components: { schemas: {} },
  };

  // Load calls.yaml (Calls API)
  if (callsExists) {
    const callsSpec = parseYaml(readFileSync(callsYamlPath, 'utf-8'));
    console.log('✓ Loaded calls.yaml');

    // Merge paths
    Object.assign(merged.paths, callsSpec.paths || {});

    // Merge schemas
    if (callsSpec.components && callsSpec.components.schemas) {
      Object.assign(merged.components.schemas, callsSpec.components.schemas);
    }
  }

  // Load platform.yaml (Platform API - accounts, applications, users, etc.)
  if (platformExists) {
    const platformSpec = parseYaml(readFileSync(platformYamlPath, 'utf-8'));
    console.log('✓ Loaded platform.yaml');

    // Merge paths
    Object.assign(merged.paths, platformSpec.paths || {});

    // Merge schemas
    if (platformSpec.components && platformSpec.components.schemas) {
      Object.assign(merged.components.schemas, platformSpec.components.schemas);
    }
  }

  return merged;
}

openapi = loadAndMergeOpenAPISpecs();

// ============================================
// Configuration
// ============================================

// Verbs that are callable methods on WebhookResponse (vs helper types)
const VERB_NAMES = new Set([
  'alert', 'answer', 'sip:decline', 'sip:request', 'sip:refer', 'config',
  'dub', 'dequeue', 'enqueue', 'leave', 'hangup', 'play', 'say', 'gather',
  'conference', 'dial', 'dialogflow', 'dtmf', 'lex', 'listen', 'stream',
  'llm', 'message', 'pause', 'rasa', 'redirect', 'rest:dial', 'tag', 'transcribe', 'pipeline'
]);

// Verbs with optional payloads (can be called with empty object or no args)
const OPTIONAL_PAYLOAD_VERBS = new Set([
  'answer', 'config', 'leave', 'hangup', 'say', 'gather', 'transcribe'
]);

// OpenAPI operations we want to extract for the SDK
const SDK_OPERATIONS = {
  // Calls
  createCall: { method: 'create', class: 'Calls', returns: 'string' },
  updateCall: { method: 'update', class: 'Calls', returns: 'void' },
  getCall: { method: 'retrieve', class: 'Calls', returns: 'ApiCall' },
  listCalls: { method: 'list', class: 'Calls', returns: 'ApiCall[]' },
  deleteCall: { method: 'delete', class: 'Calls', returns: 'void' },
  // ------Messages (not yet supported in official docs)-------
  // createMessage: { method: 'create', class: 'Messages', returns: 'string' },
  // Applications
  createApplication: { method: 'create', class: 'Applications', returns: 'string' },
  updateApplication: { method: 'update', class: 'Applications', returns: 'void' },
  listApplications: { method: 'list', class: 'Applications', returns: 'ApiApplication[]' },
  deleteApplication: { method: 'delete', class: 'Applications', returns: 'void' },
};

// OpenAPI schemas we want to include
const SDK_SCHEMAS = [
  'Webhook',
  'Target',
  'Call',
  'Application',
  // 'Message', // not yet supported in official docs
  'Account',
  'VoipCarrier',
  'SipGateway',
  'SmppGateway',
  'PhoneNumber',
  'SpeechCredential',
  'ServiceProvider',
  'Registration',
  'ApiKey',
  'amd',
  'GeneralError',
];

// Track which types we've generated to handle references
const generatedTypes = new Set();

// ============================================
// Utility Functions
// ============================================

function getSpecsVersion() {
  try {
    const pkgPath = resolve(__dirname, '../node_modules/@jambonz/verb-specifications/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || 'unknown';
  } catch (err) {
    return 'unknown';
  }
}

// Convert verb/type name to valid TypeScript interface name
function toInterfaceName(name) {
  // Handle names like "sip:decline" -> "SipDecline"
  // Handle names like "rest:dial" -> "RestDial"
  // Handle names like "sm_transcriptionConfig" -> "SmTranscriptionConfig"
  return name
    .split(/[:\-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

// Convert verb name to method name (for WebhookResponse)
function toMethodName(name) {
  // "sip:decline" -> "sip_decline" (as used in the actual SDK)
  return name.replace(':', '_');
}

// ============================================
// specs.json Type Generation (Webhook Verbs)
// ============================================

function convertSpecsType(propDef, _propName) {
  // Array of references like ["#target"]
  if (Array.isArray(propDef)) {
    const innerType = propDef[0];
    if (typeof innerType === 'string' && innerType.startsWith('#')) {
      return `${toInterfaceName(innerType.slice(1))}[]`;
    }
    return 'unknown[]';
  }

  // Object with type and enum
  if (typeof propDef === 'object' && propDef !== null) {
    if (propDef.enum) {
      return propDef.enum.map((v) => `'${v}'`).join(' | ');
    }
    if (propDef.type === 'array') {
      return 'unknown[]';
    }
    return convertSpecsSimpleType(propDef.type);
  }

  // String type definition
  if (typeof propDef === 'string') {
    if (propDef.startsWith('#')) {
      return toInterfaceName(propDef.slice(1));
    }
    return convertSpecsSimpleType(propDef);
  }

  return 'unknown';
}

function convertSpecsSimpleType(typeStr) {
  if (typeStr.includes('|')) {
    return typeStr.split('|').map((t) => convertSpecsSimpleType(t.trim())).join(' | ');
  }

  switch (typeStr) {
    case 'string': return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'object': return 'Record<string, unknown>';
    case 'array': return 'unknown[]';
    default: return 'unknown';
  }
}

function generateVerbInterface(name, spec) {
  const interfaceName = toInterfaceName(name);

  // Skip if already generated
  if (generatedTypes.has(interfaceName)) {
    return '';
  }
  generatedTypes.add(interfaceName);

  const props = spec.properties || {};
  const required = new Set(spec.required || []);

  const lines = [];
  lines.push(`  export interface ${interfaceName} {`);

  for (const [propName, propDef] of Object.entries(props)) {
    const tsType = convertSpecsType(propDef, propName);
    const optional = required.has(propName) ? '' : '?';
    lines.push(`    ${propName}${optional}: ${tsType};`);
  }

  lines.push('  }');
  return lines.join('\n');
}

function generateVerbTypes() {
  const output = [];

  output.push('  // ============================================');
  output.push('  // Verb Payload Types (from specs.json)');
  output.push('  // ============================================');
  output.push('');

  // Sort to ensure helper types come before types that reference them
  const sortedSpecs = Object.entries(specs).sort((a, b) => {
    const aIsVerb = VERB_NAMES.has(a[0]);
    const bIsVerb = VERB_NAMES.has(b[0]);
    if (aIsVerb && !bIsVerb) return 1;
    if (!aIsVerb && bIsVerb) return -1;
    return a[0].localeCompare(b[0]);
  });

  for (const [name, spec] of sortedSpecs) {
    const interfaceCode = generateVerbInterface(name, spec);
    if (interfaceCode) {
      output.push(interfaceCode);
      output.push('');
    }
  }

  return output;
}

// ============================================
// OpenAPI Type Generation (REST API)
// ============================================

function resolveRef(ref) {
  if (!openapi || !ref.startsWith('#/components/schemas/')) {
    return null;
  }
  const schemaName = ref.replace('#/components/schemas/', '');
  return openapi.components.schemas[schemaName] || null;
}

function convertOpenAPIType(schema, indent = '    ') {
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    // Use Api prefix for schemas that might conflict with verb types
    if (refName === 'Target') return 'ApiTarget';
    if (refName === 'Call') return 'ApiCall';
    if (refName === 'Application') return 'ApiApplication';
    if (refName === 'Message') return 'ApiMessage';
    return refName;
  }

  if (schema.enum) {
    return schema.enum.map((v) => `'${v}'`).join(' | ');
  }

  if (schema.allOf) {
    // Merge all schemas
    const merged = [];
    for (const subSchema of schema.allOf) {
      merged.push(convertOpenAPIType(subSchema, indent));
    }
    return merged.join(' & ');
  }

  if (schema.oneOf || schema.anyOf) {
    const schemas = schema.oneOf || schema.anyOf || [];
    return schemas.map((s) => convertOpenAPIType(s, indent)).join(' | ');
  }

  switch (schema.type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      if (schema.items) {
        return `${convertOpenAPIType(schema.items, indent)}[]`;
      }
      return 'unknown[]';
    case 'object':
      if (schema.properties) {
        return generateInlineObject(schema, indent);
      }
      return 'Record<string, unknown>';
    default:
      if (schema.properties) {
        return generateInlineObject(schema, indent);
      }
      return 'unknown';
  }
}

function generateInlineObject(schema, indent) {
  const props = schema.properties || {};
  const required = new Set(schema.required || []);
  const lines = ['{'];
  const innerIndent = indent + '  ';

  for (const [propName, propSchema] of Object.entries(props)) {
    const optional = required.has(propName) ? '' : '?';
    const propType = convertOpenAPIType(propSchema, innerIndent);
    if (propSchema.description) {
      lines.push(`${innerIndent}/** ${propSchema.description} */`);
    }
    lines.push(`${innerIndent}${propName}${optional}: ${propType};`);
  }

  lines.push(`${indent}}`);
  return lines.join('\n');
}

function generateOpenAPISchema(name, schema) {
  const nameMap = {
    Target: 'ApiTarget',
    Call: 'ApiCall',
    Application: 'ApiApplication',
    Message: 'ApiMessage',
    amd: 'Amd'
  };
  const interfaceName = nameMap[name] || name;

  if (generatedTypes.has(interfaceName)) {
    return '';
  }
  generatedTypes.add(interfaceName);

  const lines = [];

  if (schema.description) {
    lines.push(`  /** ${schema.description} */`);
  }

  lines.push(`  export interface ${interfaceName} {`);

  const props = schema.properties || {};
  const required = new Set(schema.required || []);

  for (const [propName, propSchema] of Object.entries(props)) {
    const optional = required.has(propName) ? '' : '?';
    const propType = convertOpenAPIType(propSchema, '    ');

    if (propSchema.description) {
      lines.push(`    /** ${propSchema.description} */`);
    }
    if (propSchema.enum) {
      lines.push(`    ${propName}${optional}: ${propSchema.enum.map((v) => `'${v}'`).join(' | ')};`);
    } else {
      lines.push(`    ${propName}${optional}: ${propType};`);
    }
  }

  lines.push('  }');
  return lines.join('\n');
}

function generateOperationRequestType(operationId, operation) {
  if (!operation.requestBody ||
      !operation.requestBody.content ||
      !operation.requestBody.content['application/json'] ||
      !operation.requestBody.content['application/json'].schema) {
    return '';
  }

  const schema = operation.requestBody.content['application/json'].schema;
  const typeName = operationId.charAt(0).toUpperCase() + operationId.slice(1) + 'Options';

  // Check if already generated (don't add here - generateOpenAPISchema will add it)
  if (generatedTypes.has(typeName)) {
    return '';
  }

  // If it's a reference, resolve it
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref);
    if (resolved) {
      return generateOpenAPISchema(typeName, resolved);
    }
    return '';
  }

  // Generate inline
  return generateOpenAPISchema(typeName, schema);
}

function generateRestApiTypes() {
  const output = [];

  output.push('  // ============================================');
  output.push('  // REST API Types (from calls.yaml + platform.yaml)');
  output.push('  // ============================================');
  output.push('');

  // Always add JambonzOptions (not in OpenAPI)
  output.push('  export interface JambonzOptions {');
  output.push('    baseUrl: string;');
  output.push('  }');
  output.push('');

  if (!openapi) {
    output.push('  // OpenAPI spec not found - using minimal fallback types');
    output.push('');
    return output;
  }

  // Generate schema types
  for (const schemaName of SDK_SCHEMAS) {
    const schema = openapi.components.schemas[schemaName];
    if (schema) {
      const code = generateOpenAPISchema(schemaName, schema);
      if (code) {
        output.push(code);
        output.push('');
      }
    }
  }

  // Generate operation request types
  for (const pathItem of Object.values(openapi.paths)) {
    for (const method of ['get', 'post', 'put', 'delete']) {
      const operation = pathItem[method];
      if (operation && operation.operationId && SDK_OPERATIONS[operation.operationId]) {
        const code = generateOperationRequestType(operation.operationId, operation);
        if (code) {
          output.push(code);
          output.push('');
        }
      }
    }
  }

  //---- Messaging not yet supported in official docs ----
  // Fallback: Generate missing operation types from schemas
  // This handles cases where the operation isn't in the YAML but the schema exists
  //
  //
  // const OPERATION_SCHEMA_FALLBACKS = {
  //   CreateMessageOptions: 'Message',
  // };

  // for (const [typeName, schemaName] of Object.entries(OPERATION_SCHEMA_FALLBACKS)) {
  //   if (!generatedTypes.has(typeName)) {
  //     const schema = openapi.components.schemas[schemaName];
  //     if (schema) {
  //       const code = generateOpenAPISchema(typeName, schema);
  //       if (code) {
  //         output.push(code);
  //         output.push('');
  //       }
  //     }
  //   }
  // }

  return output;
}

// ============================================
// Class Generation
// ============================================

function generateClasses() {
  const output = [];

  output.push('  // ============================================');
  output.push('  // Classes');
  output.push('  // ============================================');
  output.push('');

  output.push('  export class Calls {');
  output.push('    create(opts: CreateCallOptions): Promise<string>;');
  output.push('    update(callSid: string, opts: UpdateCallOptions): Promise<void>;');
  output.push('    list(opts?: Record<string, unknown>): Promise<ApiCall[]>;');
  output.push('    retrieve(callSid: string): Promise<ApiCall>;');
  output.push('    delete(callSid: string): Promise<void>;');
  output.push('  }');
  output.push('');

  // ------Messages class (not yet supported in official docs)------
  // output.push('  export class Messages {');
  // output.push('    create(opts: CreateMessageOptions): Promise<string>;');
  // output.push('  }');
  // output.push('');

  output.push('  export class Applications {');
  output.push('    create(opts: CreateApplicationOptions): Promise<string>;');
  output.push('    update(appSid: string, opts: UpdateApplicationOptions): Promise<void>;');
  output.push('    list(opts?: Record<string, unknown>): Promise<ApiApplication[]>;');
  output.push('    retrieve(appSid: string): Promise<ApiApplication>;');
  output.push('    delete(appSid: string): Promise<void>;');
  output.push('  }');
  output.push('');

  output.push('  export class Jambonz {');
  output.push('    constructor(accountSid: string, apiKey: string, opts: JambonzOptions);');
  output.push('    calls: Calls;');
  // output.push('    messages: Messages;'); // not yet supported in official docs
  output.push('    applications: Applications;');
  output.push('  }');
  output.push('');

  return output;
}

// ============================================
// WebhookResponse Generation
// ============================================

function generateWebhookResponse() {
  const output = [];

  output.push('  export class WebhookResponse {');
  output.push('    payload: object[];');
  output.push('    length: number;');
  output.push('');
  output.push('    constructor();');
  output.push('');
  output.push('    static verifyJambonzSignature(');
  output.push('      secret: string | string[]');
  output.push('    ): (req: unknown, res: unknown, next: () => void) => void;');
  output.push('');
  output.push('    toJSON(): object[];');
  output.push('');
  output.push('    // Verb methods');

  for (const verbName of VERB_NAMES) {
    if (specs[verbName]) {
      const methodName = toMethodName(verbName);
      const typeName = toInterfaceName(verbName);
      const optional = OPTIONAL_PAYLOAD_VERBS.has(verbName) ? '?' : '';
      output.push(`    ${methodName}(payload${optional}: ${typeName}): this;`);
    }
  }

  output.push('  }');
  output.push('');

  return output;
}

// ============================================
// Exports Generation
// ============================================

function generateExports() {
  const output = [];

  output.push('  // ============================================');
  output.push('  // Exports');
  output.push('  // ============================================');
  output.push('');
  output.push('  // Default export');
  output.push('  function jambonz(accountSid: string, apiKey: string, opts: JambonzOptions): Jambonz;');
  output.push('  export default jambonz;');
  output.push('  export { jambonz };');
  output.push('');

  return output;
}

// ============================================
// Main Generation
// ============================================

function generateTypes() {
  const output = [];

  // Header
  output.push('// Type declarations for @jambonz/node-client');
  output.push('// Auto-generated from:');
  output.push(`//   - @jambonz/verb-specifications specs.json (v${getSpecsVersion()}) - Webhook verbs`);
  output.push('//   - calls.yaml + platform.yaml - REST API types');
  output.push('//');
  output.push('// Run: npm run generate-types');
  output.push(`// Generated: ${new Date().toISOString()}`);
  output.push('');
  output.push('declare module "@jambonz/node-client" {');
  output.push('');

  // Generate verb types from specs.json
  output.push(...generateVerbTypes());

  // Generate REST API types from OpenAPI
  output.push(...generateRestApiTypes());

  // Generate classes
  output.push(...generateClasses());

  // Generate WebhookResponse
  output.push(...generateWebhookResponse());

  // Generate exports
  output.push(...generateExports());

  output.push('}');

  return output.join('\n');
}

// ============================================
// Main Execution
// ============================================

function main() {
  console.log('Generating jambonz types...');
  console.log(`  specs.json version: ${getSpecsVersion()}`);

  // Ensure types directory exists
  const typesDir = resolve(__dirname, '../types');
  mkdirSync(typesDir, { recursive: true });

  // Generate the types
  const types = generateTypes();

  // Write to output file
  const outputPath = resolve(typesDir, 'jambonz-node-client.d.ts');
  writeFileSync(outputPath, types);

  console.log(`✓ Generated ${generatedTypes.size} types`);
  console.log(`✓ Output: ${outputPath}`);
}

main();
