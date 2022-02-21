const Jambonz = require('./rest/jambonz');

const initializer = (accountSid, apiKey, opts) => {
  return new Jambonz(accountSid, apiKey, opts);
};

initializer.Jambonz = Jambonz;
initializer.WebhookResponse = require('./jambonz/webhook-response');
initializer.WsRouter = require('./jambonz/ws-router');
initializer.WsSession = require('./jambonz/ws-session');
initializer.handleProtocols = (protocols) => {
  if (!protocols.has('ws.jambonz.org')) return false;
  return 'ws.jambonz.org';
};


module.exports = initializer;
