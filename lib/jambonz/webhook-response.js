const crypto = require('crypto');
const logger = { debug: require('debug')('jambonz:jambonz-node')};
const {validateVerb, specs } = require('@jambonz/verb-specifications');
const _specs = new Map(Object.entries(specs));
const EXPECTED_SCHEME = 'v1';
const DEFAULT_TOLERANCE = 300; // 5 minutes

/**
 * Secure compare, from https://github.com/freewil/scmp
*/
function secureCompare(a, b) {
  a = Buffer.from(a);
  b = Buffer.from(b);

  // return early here if buffer lengths are not equal since timingSafeEqual
  // will throw if buffer lengths are not equal
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

function parseHeader(header, scheme) {
  if (typeof header !== 'string') {
    return null;
  }

  const keyActions = {
    t: (accum, value) => (accum.timestamp = value, accum),
    [scheme]: (accum, value) => (accum.signatures.push(value), accum)
  };

  return header.split(',').reduce(
    (accum, item) => {
      const [key, value] = item.split('=');
      return keyActions[key] ? keyActions[key](accum, value) : accum;
    },
    {
      timestamp: -1,
      signatures: [],
    }
  );
}

function computeSignature(payload, timestamp, secret) {
  const data = Buffer.isBuffer(payload) ?
    payload.toString('utf8') :
    (typeof payload === 'object' ? JSON.stringify(payload) : payload);
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${data}`, 'utf8')
    .digest('hex');
}

class WebhookResponse {
  constructor() {

    this.payload = [];
  }

  get length() {
    return this.payload.length;
  }

  set length(len) {
    this.payload.length = len;
  }

  /**
   * returns a middleware function that can be used to verify
   * the incoming request was signed by jambonz
   * @param {string} secret - webhook signing secret
   * @param {object} opts - opts
   * @returns function
   */
  static verifyJambonzSignature(secret) {
    return (req, res, next) => {
      const header = req.get('Jambonz-Signature');
      if (!header) throw new Error(`Missing Jambonz-Signature in ${req.url}`);
      const details = parseHeader(header, EXPECTED_SCHEME);
      if (!details || details.timestamp === -1) {
        throw new Error('unable to extract timestamp and signatures from header');
      }
      if (!details.signatures.length) {
        throw new Error('no signatures found');
      }
      const secrets = Array.isArray(secret) ? secret : [secret];
      let signatureFound = false;
      for (const secret of secrets) {
        const expectedSignature = computeSignature(req.body, details.timestamp, secret);
        signatureFound = details.signatures.some((sig) => secureCompare(expectedSignature, sig));
        if (signatureFound) break;
      }
      if (!signatureFound) {
        throw new Error('No matching signatures found');
      }

      const timestampAge = Math.floor(Date.now() / 1000) - details.timestamp;
      if (timestampAge > DEFAULT_TOLERANCE) {
        throw new Error('timestamp outside of tolerance');
      }
      next();
    };
  }

  toJSON() {
    return this.payload;
  }

  addVerb(verb, payload) {
    validateVerb(verb, payload, logger);
    this.payload.push({verb: verb.replace('_', ':'), ...payload});
    return this;
  }
}

for (const [verb] of _specs) {
  WebhookResponse.prototype[verb.replace(':', '_')] = function(payload) {
    return WebhookResponse.prototype.addVerb.call(this, verb, payload);
  };
}

module.exports = WebhookResponse;
