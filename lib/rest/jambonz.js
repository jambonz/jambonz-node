const assert = require('assert');
const bent = require('bent');
const Calls = require('./calls');

class Jambonz {
  constructor(accountSid, apiKey, opts) {
    assert.ok(typeof accountSid === 'string', 'accountSid required');
    assert.ok(typeof apiKey === 'string', 'apiKey required');

    assert.ok(opts.baseUrl, 'opts.baseUrl required when instantiating jambon REST client');

    let baseUrl = opts.baseUrl;
    if (opts.baseUrl.endsWith('/v1')) baseUrl = `${opts.baseUrl}/`;
    else if (opts.baseUrl.endsWith('/v1/')) {}
    else if (opts.baseUrl.endsWith('/')) baseUrl = `${opts.baseUrl}v1/`;
    else baseUrl = `${opts.baseUrl}/v1/`;

    const headers = {'Authorization': `Bearer ${apiKey}`};

    const post = bent(baseUrl, 'POST', 'json', headers, 201);
    const put = bent(baseUrl, 'PUT', headers, 204);
    const get = bent(baseUrl, 'GET', 'json', headers, 200);
    const del = bent(baseUrl, 'DELETE', headers, 204);

    this.calls = new Calls(accountSid, apiKey, {baseUrl, post, put, get, del});
  }
}

module.exports = Jambonz;
