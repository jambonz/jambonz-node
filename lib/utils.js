const debug = require('debug')('jambonz:jambonz-node');
const assert = require('assert');
const specs = new Map(Object.entries(require('./jambonz/specs.json')));

/**
 * copied from jambonz-feature-server/lib/tasks.js
*/
function validate(name, data) {
  debug(`validating ${name} with data ${JSON.stringify(data)}`);
  // validate the instruction is supported
  if (!specs.has(name)) throw new Error(`invalid instruction: ${name}`);

  // check type of each element and make sure required elements are present
  const specData = specs.get(name);
  let required = specData.required || [];
  for (const dKey in data) {
    if (dKey in specData.properties) {
      const dVal = data[dKey];
      const dSpec = specData.properties[dKey];
      debug(`Task:validate validating property ${dKey} with value ${JSON.stringify(dVal)}`);

      if (typeof dSpec === 'string' && dSpec === 'array') {
        if (!Array.isArray(dVal)) throw new Error(`${name}: property ${dKey} is not an array`);
      }
      else if (typeof dSpec === 'string' && dSpec.includes('|')) {
        const types = dSpec.split('|').map((t) => t.trim());
        if (!types.includes(typeof dVal) && !(types.includes('array') && Array.isArray(dVal))) {
          throw new Error(`${name}: property ${dKey} has invalid data type, must be one of ${types}`);
        }
      }
      else if (typeof dSpec === 'string' && ['number', 'string', 'object', 'boolean'].includes(dSpec)) {
        // simple types
        if (typeof dVal !== specData.properties[dKey]) {
          throw new Error(`${name}: property ${dKey} has invalid data type`);
        }
      }
      else if (Array.isArray(dSpec) && dSpec[0].startsWith('#')) {
        const name = dSpec[0].slice(1);
        for (const item of dVal) {
          validate(name, item);
        }
      }
      else if (typeof dSpec === 'object') {
        // complex types
        const type = dSpec.type;
        assert.ok(['number', 'string', 'object', 'boolean'].includes(type),
          `invalid or missing type in spec ${JSON.stringify(dSpec)}`);
        if (type === 'string' && dSpec.enum) {
          assert.ok(Array.isArray(dSpec.enum), `enum must be an array ${JSON.stringify(dSpec.enum)}`);
          if (!dSpec.enum.includes(dVal)) throw new Error(`invalid value ${dVal} must be one of ${dSpec.enum}`);
        }
      }
      else if (typeof dSpec === 'string' && dSpec.startsWith('#')) {
        // reference to another datatype (i.e. nested type)
        const name = dSpec.slice(1);
        //const obj = {};
        //obj[name] = dVal;
        validate(name, dVal);
      }
      else {
        assert.ok(0, `invalid spec ${JSON.stringify(dSpec)}`);
      }
      required = required.filter((item) => item !== dKey);
    }
    else throw new Error(`${name}: unknown property ${dKey}`);
  }
  if (required.length > 0) throw new Error(`${name}: missing value for ${required}`);
}
/**
 * end of copy
*/

/**
 * Validate the payload for an updateCall request
 */
const validateCallUpdate = (opts) => {
  const {call_hook, child_call_hook, call_status, listen_status, mute_status, whisper, conf_hold_status} = opts;

  assert.ok(call_hook || child_call_hook || call_status || listen_status || mute_status || whisper  || conf_hold_status,
    `calls.update: invalid request ${JSON.stringify(opts)}`);

  if (call_status) assert.ok(['completed', 'no-answer'].includes(call_status),
    `invalid call_status: ${call_status}, must be 'completed' or 'no-answer'`);

  if (mute_status) assert.ok(['mute', 'unmute'].includes(mute_status),
    `invalid mute_status: ${mute_status}, must be 'mute' or 'unmute'`);

  if (conf_hold_status) assert.ok(['hold', 'unhold'].includes(conf_hold_status),
    `invalid mute_status: ${mute_status}, must be 'mute' or 'unmute'`);

  if (whisper) assert.ok(whisper.verb,
    `invalid whisper: ${JSON.stringify(whisper)}, must  be a 'play' or 'say' verb`);
};

/**
 * Validate the payload for a createCall request
 */
const validateCallCreate = (opts) => {
  const {application_sid, call_hook, call_status_hook, from, to} = opts;

  assert.ok(from && typeof from === 'string', 'calls.create: from property is required');
  assert.ok(to && typeof to === 'object', 'calls.create: to property is required');
  assert.ok(application_sid || call_hook, 'calls.create: application_sid or call_hook is required');
  assert.ok(call_status_hook || !call_hook, 'calls.create: call_status_hook is required when call_hook is used');

  const hookUrl = typeof call_hook === 'object' ? call_hook.url : call_hook;
  if (hookUrl) assert.ok(/^https?:/.test(hookUrl), 'call_hook must be an absolute url');
  const hookStatusUrl = typeof call_status_hook === 'object' ? call_status_hook.url : call_status_hook;
  if (hookStatusUrl) assert.ok(/^https?:/.test(hookStatusUrl), 'call_status_hook must be an absolute url');
};

const validateCallList = (opts) => {

};

const validateMessageCreate = (opts) => {
  const {from, to, text} = opts;
  assert.ok(from && typeof from === 'string', 'messages.create: from property is required');
  assert.ok(to && typeof to === 'object', 'message.create: to property is required');
  assert.ok(text && typeof text === 'object', 'message.create: text property is required');

};

module.exports = {
  validate,
  specs,
  validators: {
    Calls: {
      create: validateCallCreate,
      update: validateCallUpdate,
      list: validateCallList
    },
    Messages: {
      validateMessageCreate
    }
  }
};
