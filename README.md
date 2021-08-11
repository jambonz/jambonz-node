# @jambonz/node-client

A Node.js SDK for the open source [jambonz](docs.jambonz.org) CPaaS platform.  Node.js applications can use this library to respond to [jambonz webhooks](https://docs.jambonz.org/jambonz/) and to make [REST API calls](https://docs.jambonz.org/rest/) to a jambonz platform.

> Note: One suggested way to get up and running with this Node SDK is to use the `npx create-jambonz-app` command, which will scaffold out a jambonz application for you using this SDK.

### Webooks
To respond to webhooks, you will need a lightweight http server.  An example is shown below using [express](expressjs.com).
```
const {WebhookResponse} = require('@jambonz/node-client');
const express = require('express');
const app = express();

app.use(express.json());

app.post('/my-app', (req, res) => {
  const jambonz = new WebhookResponse();
  jambonz
    .pause({length: 1.5})
    .say({
      text: 'Good morning. This is a simple test of text to speech functionality.  That is all.  Goodbye',
      synthesizer: {
        vendor: 'google',
        language: 'en-US'
      }
    });
  res.status(200).json(app);
});

app.listen(port, () => {
  logger.info(`listening at http://localhost:${port}`);
});
```
[See here](https://docs.jambonz.org/jambonz/) for information on the available verbs you can use in a jambonz application, and for their associated properties.

#### Verifying webhook signature
If your jambonz server includes a Jambonz-Signature header on webhook requests, you can verify that the request was signed by jambonz using your webhook secret as follows:

```
const {WebhookResponse} = require('@jambonz/node-client');

if (process.env.WEBHOOK_SECRET) {
  app.use(WebhookResponse.verifyJambonzSignature(process.env.WEBHOOK_SECRET));
}

const express = require('express');
const app = express();

app.use(express.json());

/* make sure this comes after the body has been converted to json */
if (process.env.WEBHOOK_SECRET) {
  app.use(WebhookResponse.verifyJambonzSignature(process.env.WEBHOOK_SECRET));
}

/* if we get here we know the request was signed with our webhook secret */
app.post('/my-app', (req, res) => { ...})
```

### REST API calls

#### Creating a client
To use the REST API you need to know your account sid and api key (both of which you can view in the jambonz portal).  You generate a REST client as shown below.
```
const client = require('@jambonz/node-client')(<my-account-sid>, <my-api-key>, {
  baseUrl: http://<my-jambonz-sbc>
});
```

All of the above parameters are required (account sid, api key, and baseUrl);

#### Calls
##### Creating a call
```
const sid = await client.calls.create({
  from: '16172223333',
  to: {
    type: 'phone',
    number: '15083084808'
  },
  call_hook: 'http://myurl.com/myapp-webhook',
  call_status_hook: 'http://myurl.com/call-status'
});
```
[See here](https://docs.jambonz.org/rest/#create-a-call) for further details.

##### Updating a call
To update a call in progress -- for example to mute/unmute, hangup the call etc -- you need to know the call sid.  Typically you would get this from a webhook sent from an existing call event.

```
  // play a whisper prompt to one party on the call
  await client.calls.update(<my-call-sid>, {
    whisper: {
        verb: 'say',
        text: 'You have 30 seconds remaining on this call.'
      }
    }
  });
```
[See here](https://docs.jambonz.org/rest/#updating-a-call) for further details.

### Example 

See [here](https://github.com/jambonz/jambonz-node-example-app) for a full-featured example application built using this API.

### Status
This project is under active development and is currently very much pre-beta.

