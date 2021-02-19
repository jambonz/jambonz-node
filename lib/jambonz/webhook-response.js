const {validate, specs} = require('../utils');

class WebhookResponse {
  constructor() {

    this.payload = [];
  }

  get length() {
    return this.payload.length;
  }

  set length(len) {
    this.payload.length = len;
  }

  toJSON() {
    return this.payload;
  }

  addVerb(verb, payload) {
    validate(verb, payload);
    this.payload.push({verb: verb.replace('_', ':'), ...payload});
    return this;
  }
}

for (const [verb] of specs) {
  WebhookResponse.prototype[verb] = function(payload) {
    return WebhookResponse.prototype.addVerb.call(this, verb, payload);
  };
}

module.exports = WebhookResponse;
