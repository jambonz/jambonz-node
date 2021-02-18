const assert = require('assert');

class Calls {
  constructor(accountSid, apiKey, opts) {
    this.accountSid = accountSid;
    this.apiKey = apiKey;

    ['post', 'put', 'get', 'del'].forEach((m) => this[m] = opts[m]);
  }

  async update(callSid, opts) {
    const {call_hook, call_status, listen_status, mute_status, whisper} = opts;

    assert.ok(call_hook || call_status || listen_status || mute_status || whisper,
      `calls.update: invalid request ${JSON.stringify(opts)}`);

    if (call_status) assert.ok(['completed', 'no-answer'].includes(call_status),
      `invalid call_status: ${call_status}, must be 'completed' or 'no-answer'`);

    if (mute_status) assert.ok(['mute', 'unmute'].includes(mute_status),
      `invalid mute_status: ${mute_status}, must be 'mute' or 'unmute'`);

    if (whisper) assert.ok(whisper.verb,
      `invalid whisper: ${JSON.stringify(whisper)}, must  be a 'play' or 'say' verb`);

    await this.post(`Accounts/${this.accountSid}/Calls/${callSid}`, opts);
  }
}

module.exports = Calls;
