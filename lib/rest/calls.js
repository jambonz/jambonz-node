const {validateCallUpdate, validateCallCreate} = require('../utils');

class Calls {
  constructor(accountSid, apiKey, opts) {
    this.accountSid = accountSid;
    this.apiKey = apiKey;

    ['post', 'put', 'get', 'del'].forEach((m) => this[m] = opts[m]);
  }

  /**
   * Create a new outbound call
   * @param {*} opts - see https://docs.jambonz.org/rest/#create-a-call for details
   */
  async create(opts) {
    validateCallCreate(opts);
    const res = await this.post(`Accounts/${this.accountSid}/Calls`, opts);
    return res.sid;
  }


  /**
   * Update a call in progress.  Available operations are:
   * - mute / unmute
   * - pause / resume a "listen" audio stream
   * - hang up the call
   * - play a whisper prompt to one party
   * - redirect the call to a new application
   * @param {*} callSid - identifies call leg to operate on
   * @param {*} opts - see https://docs.jambonz.org/rest/#updating-a-call for details
   */
  async update(callSid, opts) {
    validateCallUpdate(opts);
    const res = await this.put(`Accounts/${this.accountSid}/Calls/${callSid}`, opts);
    if (res.statusCode === 404) throw new Error(`Calls.update: call_sid ${callSid} not found`);
    if (res.statusCode !== 204) throw new Error(`Calls.update: unexpected status code ${res.statusCode}`);
  }
}

module.exports = Calls;
