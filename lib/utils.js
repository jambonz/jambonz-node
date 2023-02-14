const assert = require('assert');
/**
 * end of copy
*/

/**
 * Validate the payload for an updateCall request
 */
const validateCallUpdate = (opts) => {
  const {
    call_hook,
    child_call_hook,
    call_status,
    listen_status,
    mute_status,
    whisper,
    conf_hold_status,
    sip_request
  } = opts;

  assert.ok(call_hook || child_call_hook || call_status ||
    listen_status || mute_status || whisper  ||
    conf_hold_status || sip_request, `calls.update: invalid request ${JSON.stringify(opts)}`);

  if (call_status) assert.ok(['completed', 'no-answer'].includes(call_status),
    `invalid call_status: ${call_status}, must be 'completed' or 'no-answer'`);

  if (mute_status) assert.ok(['mute', 'unmute'].includes(mute_status),
    `invalid mute_status: ${mute_status}, must be 'mute' or 'unmute'`);

  if (conf_hold_status) assert.ok(['hold', 'unhold'].includes(conf_hold_status),
    `invalid mute_status: ${mute_status}, must be 'mute' or 'unmute'`);

  if (whisper) assert.ok(whisper.verb,
    `invalid whisper: ${JSON.stringify(whisper)}, must  be a 'play' or 'say' verb`);

  if (sip_request) assert.ok(sip_request.method,
    `invalid sip_request: ${JSON.stringify(whisper)}, must  include a 'method' property`);

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
