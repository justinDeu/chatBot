/* The necessary modules to function being declared */
const dotenv = require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const apiaiApp = require('apiai')(process.env.APIAI_KEY);
const generateResponse = require('./generateResponse.js');

/* Telling the express app to use bodyparser to handle JSON */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


/* Setting the server to listen on the environment's port or default to 3000 */
const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'tuxedo_cat') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});


/* Handling all messages */
app.post('/webhook', (req, res) => {
  console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});


/* Echoes the message back gathering the sender and text from the event passed in*/
function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  /* Passing the text of the event to apiai to analyze what is required */
  let apiai = apiaiApp.textRequest(text, {
  	sessionId: 'my_chat'
  });

  apiai.on('response', async (response) => {

      let responseText = await generateResponse(response);


  	/* Sending the message back to facebook with the produced response */
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
   	 	qs: {access_token: process.env.ACCESS_TOKEN},
   	 	method: 'POST',
   	 	json: {
  	    	recipient: {id: sender},
  	    	message: {text: responseText}
      	}
	}, function (error, response) {
	    if (error) {
	        console.log('Error sending message: ', error);
	    } else if (response.body.error) {
	        console.log('Error: ', response.body.error);
	    }
	  });
	});

  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();

}

