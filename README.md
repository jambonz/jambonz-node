# @jambonz/node-client

A Node.js SDK for the open source [jambonz](docs.jambonz.org) CPaaS platform.  Node.js applications can use this library to respond to [jambonz webhooks](https://docs.jambonz.org/jambonz/) and to make [REST API calls](https://docs.jambonz.org/rest/) to a jambonz platform.

### Webooks
To respond to webhooks, you will need a lightweight http server.  An example is shown below using [express](expressjs.com).
```
const WebhookResponse = require('@jambonz/node-client').WebhookResponse;
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

### REST API calls
To use the REST API you need to know your account sid (which you can see in the jambonz portal), and an api key (which you can generate in the jambonz portal).  You generate a REST client as shown below.
```
const client = require('@jambonz/node-client')(<my-account-sid>, <my-api-key>, {
  baseUrl: http://<my-jambonz-sbc>
});
```

All of the above parameters are required (account sid, api key, and baseUrl);

An example of using the client to perform live control to play a whisper prompt to the caller is shown below:
```
  await client.calls.update(<my-call-sid>, {
    whisper: {
        verb: 'say',
        text: 'You have 30 seconds remaining on this call.'
      }
    }
  });
```

### Example 

See [here](https://github.com/jambonz/jambonz-node-example-app) for a full-featured example application built using this API.

### Status
This project is under active development and is currently very much pre-beta.

