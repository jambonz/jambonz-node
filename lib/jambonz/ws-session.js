const Emitter = require('events');
const assert = require('assert');
const monkeyPatch = require('./monkey-patch-ws');

const noopLogger = {
  error: () => {},
  info: () => {},
  debug: () => {},
  child: () => this
};

class WsSession extends Emitter {
  constructor({logger, router, ws, req}) {
    super();

    assert(router);
    assert(ws);
    assert(req);

    this.ws = ws;
    this.logger = logger || noopLogger;
    this.req = req;
    this.router = router;
    this._initialMsgRecvd = false;

    monkeyPatch(this.ws, {logger, req});
    this._setHandlers();
    logger.info(`got websocket connection for url ${req.url}`);
  }

  _setHandlers() {
    this.ws
      //.on('close', this._onClose.bind(this))
      //.on('error', this._onError.bind(this))
      .on('message', this._onMessage.bind(this));
  }

  _onMessage(data, isBinary) {
    if (isBinary) {
      this.logger.info('discarding incoming binary message');
      return;
    }
    try {
      const {type, msgid, hook, call_sid, data:payload = {}} = JSON.parse(data);
      assert.ok(type, 'missing type property');
      assert.ok(msgid, 'missing msgid property');
      if (!this._initialMsgRecvd) {
        this._initialMsgRecvd = true;
        if (!this.router.route(this.ws)) {
          this.logger.info(`no route found for ${this.req.url}`);
          this.ws.removeAllListeners();
          this.ws.close();
        }
      }
      this.logger.debug({type, msgid, call_sid, payload}, 'Received message from jambonz');
      switch (type) {
        case 'session:new':
        case 'session:reconnect':
        case 'call:status':
        case 'verb:hook':
        case 'verb:status':
        case 'jambonz:error':
          this.ws.emit(type, {msgid, call_sid, hook, payload});
          break;
        default:
          assert.ok(false, `invalid type ${type}`);
      }
    } catch (err) {
      this.logger.info({err}, 'Error handling incoming message');
    }
  }

  _onClose() {
    this.emit('close');
  }

  _onError(err) {
    this.emit('error', err);
  }
}

module.exports = WsSession;
