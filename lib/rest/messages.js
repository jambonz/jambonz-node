const RestEntity = require('./rest-entity');

class Messages extends RestEntity {
  constructor(accountSid, apiKey, opts) {
    super('Messages', accountSid, apiKey, opts);
    this.enabledOperations = [RestEntity.create];
  }
}

module.exports = Messages;
