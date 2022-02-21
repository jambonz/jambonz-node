const assert = require('assert');
const parseurl = require('parseurl');

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
    this.routes.push({match, callback});
  }

  route(ws) {
    const {req} = ws.locals;
    const parsed = parseurl(req);
    const path = parsed.pathname;

    const route = this.routes.find(({match}) => {
      /* wildcard */
      if ('*' === match) return true;

      /* try matching by path */
      const urlChunks = path.split('/').filter((c) => c.length);
      const matchChunks = match.split('/').filter((c) => c.length);
      if (urlChunks.length >= matchChunks.length) {
        let idx = 0;
        do {
          if (urlChunks[idx] !== matchChunks[idx]) break;
          idx++;
        } while (idx < matchChunks.length);
        if (idx > 0) {
          req.url = urlChunks.slice(idx).join('/') + '/' + (parsed.search || '');
          return true;
        }
      }

      /* TODO: try matching by param */

      /* TODO : try matching by query args */
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
