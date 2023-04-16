const assert = require('assert');
const parseurl = require('parseurl');

function matchesPath(match, path) {
  if ('*' === match) return true;

  const urlChunks = path.split('/').filter((c) => c.length);
  const matchChunks = match.split('/').filter((c) => c.length);

  if (urlChunks.length >= matchChunks.length) {
    return matchChunks.every((chunk, idx) => chunk === urlChunks[idx]);
  }

  return false;
}

class WsRouter {
  constructor() {
    this.routes = [];
  }

  use(match, callback) {
    if (!callback) {
      callback = match;
      match = '*';
    }
    assert.ok(typeof callback === 'function' || callback instanceof WsRouter,
      'WsRouter.use - callback must be a function or a WsRouter instance');
    assert.ok(typeof match === 'string', 'WsRouter.use - match must be a string');
    this.routes.push({match, callback});
  }

  route(ws) {
    const {req} = ws.locals;
    const parsed = parseurl(req);
    const path = parsed.pathname;

    const route = this.routes.find(({match}) => {
      return matchesPath(match, path);
    });

    if (!route) return false;

    const {callback} = route;
    if (typeof callback === 'function') {
      callback(ws);
      return true;
    }
    return callback.route(ws);
  }
}

module.exports = WsRouter;
