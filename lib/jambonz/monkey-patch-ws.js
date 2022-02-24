const assert = require('assert');
const WebhookResponse = require('./webhook-response');

module.exports = (ws, {logger, req}) => {
  ws.locals = {logger, req, url: req.url, originalUrl: req.url};

  /* helper for sending an ack to jambonz */
  ws.ack = (msgid, res) => {
    let msg = {
      type: 'ack',
      msgid
    };
    if (res) msg = {...msg, data: res};
    try {
      logger.info({msg}, 'sending ack');
      ws.send(JSON.stringify(msg));
    } catch (err) {
      logger.error({err}, 'Error sending ack to jambonz');
    }
  };

  ws.sendCommand = (command, payload, queueCommand = false) => {
    payload = payload instanceof WebhookResponse ? payload.toJSON() : payload;
    assert.ok(typeof payload === 'object' && Object.keys(payload).length > 0,
      'invalid or missing payload');
    //TODO: validate command

    const msg = {
      type: 'command',
      command,
      queueCommand,
      data: payload
    };
    try {
      logger.info({msg}, 'sending command');
      ws.send(JSON.stringify(msg));
    } catch (err) {
      logger.error({err}, `Error sending command ${command} to jambonz`);
    }
  };
};
