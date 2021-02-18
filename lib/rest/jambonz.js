const assert = require('assert');
class Jambonz {
  constructor(accountSid, apiKey, opts) {
    assert.ok(typeof accountSid === 'string', 'accountSid required');
    assert.ok(typeof apiKey === 'string', 'apiKey required');
    opts = opts || {};

    this.endpoint = opts.endpoint;

    // TODO: test credentials, throw exception on failure
  }
}

module.exports = Jambonz;
