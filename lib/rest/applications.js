const RestEntity = require('./rest-entity');

class Applications extends RestEntity {
  constructor(accountSid, apiKey, opts) {
    super('Applications', accountSid, apiKey, opts);
    this.enabledOperations = [
      RestEntity.create,
      RestEntity.retrieve,
      RestEntity.list,
      RestEntity.delete
    ];
  }
}

module.exports = Applications;
