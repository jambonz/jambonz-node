class RestEntity {
  constructor(name, accountSid, apiKey, opts) {
    this.name = name;
    this.accountSid = accountSid;
    this.apiKey = apiKey;
    this.enabledOperations = []; // subclass responsibility to fill
    this.validators = require('../utils').validators[name] || {};

    ['post', 'put', 'get', 'del'].forEach((m) => this[m] = opts[m]);
  }

  async create(opts) {
    if (this.validators.create) this.validators.create(opts);
    const res = await this.post(`Accounts/${this.accountSid}/${this.name}`, opts);
    return res.sid;
  }

  async update(sid, opts) {
    if (this.validators.update) this.validators.update(opts);
    const res = await this.put(`Accounts/${this.accountSid}/${this.name}/${sid}`, opts);
    if (res.statusCode === 404) throw new Error(`${this.name}.update: sid ${sid} not found`);
    if (![200, 202, 204].includes(res.statusCode)) {
      throw new Error(`${this.name}.update: unexpected status code ${res.statusCode}`);
    }
  }

  async list(opts) {
    if (this.validators.list) this.validators.list(opts);
    const res = await this.get(`Accounts/${this.accountSid}/${this.name}/`);
    return res;
  }

  async retrieve(sid) {
    try {
      const res = await this.get(`Accounts/${this.accountSid}/${this.name}/${sid}`);
      return res.length > 0 ? res[0] : null;
    } catch (err) {
      if (err.statusCode === 404) throw new Error(`${this.name}.retrieve: sid ${sid} not found`);
      if (err.statusCode !== 204) throw new Error(`${this.name}.retrieve: unexpected status code ${err.statusCode}`);
    }
  }

  async delete(sid) {
    const res = await this.del(`Accounts/${this.accountSid}/${this.name}/${sid}`);
    if (res.statusCode === 404) throw new Error(`${this.name}.delete: sid ${sid} not found`);
    if (res.statusCode !== 204) throw new Error(`${this.name}.update: unexpected status code ${res.statusCode}`);
  }
}

RestEntity.create = 'create';
RestEntity.retrieve = 'retrieve';
RestEntity.list = 'list';
RestEntity.update = 'update';
RestEntity.delete = 'delete';

module.exports = RestEntity;

