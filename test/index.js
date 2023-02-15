const test = require('tape');

const fetchData = (json) => {
  const keys = Object.keys(json);
  return json[keys[0]];
}

test('unit tests', (t) => {
  const WebhookResponse = require('..').WebhookResponse;

  let app = new WebhookResponse();
  app.sip_decline(fetchData(require('./data/good/sip-decline')));
  let json = app.toJSON();
  // verify that the verb is sip:decline not sip_decline (special case for verbs with colons)
  t.ok(json[0].verb === 'sip:decline', 'sip_decline: passes');
  app.say(fetchData(require('./data/good/say')));
  t.pass('say: passes');
  app.say(fetchData(require('./data/good/say-text-array')));
  t.pass('say: passes with array of text');
  app.pause(fetchData(require('./data/good/pause')));
  t.pass('pause: passes with array of text');
  app.dial(fetchData(require('./data/good/dial-sip')));
  t.pass('dial: passes with target sip');
  app.dial(fetchData(require('./data/good/dial-phone')));
  t.pass('dial: passes with target phone');
  app.dial(fetchData(require('./data/good/dial-user')));
  t.pass('dial: passes with target user');
  app.dial(fetchData(require('./data/good/dial-listen')));
  t.pass('dial: passes with embedded listen');
  
  
  //let payload = app.toJSON();
  //console.log(payload);
  //let task = makeTask(logger, require('./data/good/sip-decline'));
  //t.ok(task.name === 'sip:decline', 'parsed sip:decline');

  //t.throws(errInvalidInstruction, /malformed jambonz application payload/, 'throws error for invalid instruction');
  //t.throws(errUnknownProperty, /unknown property/, 'throws error for invalid instruction');
  //t.throws(errMissingProperty, /missing value/, 'throws error for missing required property');
  //t.throws(errInvalidType, /invalid data type/, 'throws error for invalid data type');
  //t.throws(errBadEnum, /must be one of/, 'throws error for invalid enum');
  //t.throws(errBadPayload, /malformed jambonz application payload/, 'throws error for invalid payload with multiple keys');
  //t.throws(errBadPayload2, /malformed jambonz application payload/, 'throws error for invalid payload that is not an object');

  t.end();
});


const errInvalidInstruction = () => makeTask(logger, require('./data/bad/unknown-instruction'));
const errUnknownProperty = () => makeTask(logger, require('./data/bad/unknown-property'));
const errMissingProperty = () => makeTask(logger, require('./data/bad/missing-required-property'));
const errInvalidType = () => makeTask(logger, require('./data/bad/invalid-type'));
const errBadEnum = () => makeTask(logger, require('./data/bad/bad-enum'));
const errBadPayload = () => makeTask(logger, require('./data/bad/bad-payload'));
const errBadPayload2 = () => makeTask(logger, require('./data/bad/bad-payload2'));
