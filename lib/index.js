const Jambonz = require('./rest/jambonz');

const initializer = (accountSid, apiKey, opts) => {
  return new Jambonz(accountSid, apiKey, opts);
};

initializer.Jambonz = Jambonz;
initializer.WebhookResponse = require('./jambonz/webhook-response');

module.exports = initializer;
