/* The necessary modules to function being declard */
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const apiaiApp = require('apiai')('00486919fdc14c738418d62ee543cbf5');
const MongoClient = require('mongodb').MongoClient;

/* Telling the express app to use bodyparser to handle JSON */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


/* Setting the server to listen on the environment's port or default to 3000 */
const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});


/* Connecting to the MongoDB database for information */
const url = 'mongodb://AppReading:VT2021@ds135537.mlab.com:35537/vt_information';
const dbName = 'vt_information';

MongoClient.connect(url, function(err, client) {
	if (err) {
		console.log(err);
	} else {
		console.log('Successfully connected to the MongoDb database!');
	}

	const db = client.db(dbName);
});


/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'tuxedo_cat') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});


/* Handling all messenges */
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

  var responseText; // the variable that will hold the text to send back


  apiai.on('response', (response) => {

  	console.log(response);

  	/* Creating the response based off the intentName in the JSON */
  	switch (response.result.metadata.intentName) {
  		case 'buildingAge':
  			
  			let building_id = response.result.parameters.vt_building;

  			responseText = "I'm struggling.";
  			break;

  		case 'welcome':
  			responseText = response.result.fulfillment.speech;
  			break;

  		default: 
  			responseText = response.result.fulfillment.speech;
  	}

  	/* Sending the message back to facebook with the produced response */
	request({
		url: 'https://graph.facebook.com/v2.6/me/messages',
   	 	qs: {access_token: 'EAAFjH7OUxG4BAI3O0EyaHubKQU455pf0wFUCZCjKIgChAy3KieZCk31ZBR96ZCZB7aNDkfcpuDjh3H9oBGYLY19rsGO6qh0RsdTlB8pfBcYhFTbAOmCYM54Iq2h55Suxg2jDyemdOCSyS5tXS0oZCYmG3rVHHixqXfLaEiv03ZA7VY18GwqJWAn'},
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