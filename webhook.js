/* The necessary modules to function being declard */
const dotenv = require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const apiaiApp = require('apiai')(process.env.APIAI_KEY);
const MongoClient = require('mongodb').MongoClient;


// Temporarily declaring global var db for the mongo database 
var db;

/* Telling the express app to use bodyparser to handle JSON */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


/* Setting the server to listen on the environment's port or default to 3000 */
const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});


/* Connecting to the MongoDB database for information */
const url = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DBNAME}`;
const dbName = process.env.MONGO_DBNAME;

console.log('First Call:');
buildingQuery('TORG');

console.log('');
console.log('Second Call:');
buildingQuery('NCB');

/*MongoClient.connect(url, function(err, client) {
	if (err) {
		console.log(err);
	} else {
		console.log('Successfully connected to the MongoDb database!');
	}

	db = client.db(dbName);

	const buildings = db.collection('buildings');
	buildings.findOne({building_id: 'TORG'}, (err, res) => {
		console.log('Found the following: ');
		console.log(res);
	});

	client.close();
});*/


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
  			
  			let requested_id = response.result.parameters.vt_building;

  			db.collection("buildings").findOne({building_id: requested_id}, function(err, res) {
  				if (err) {
  					console.log(err);
  				} else {
  					responseText = "I found: " + res.building_name;
  				}
  			});

  			if (typeof responseText === "undefined") {
  				responseText = "Failed to find building."
  			}
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

/* Connects to the MongoDB and queries the builidings
	database to find and return the desired building */
async function buildingQuery(requested_id) {
	MongoClient.connect(url, function(err, client) {
	if (err) {
		console.log(err);
	} else {
		console.log('Successfully connected to the MongoDb database for query of: ' + requested_id);
	}

	db = client.db(dbName);

	const buildings = db.collection('buildings');

	var response
	try {
		response = await buildings.findOne({building_id: requested_id});
	} catch (err) {
		console.log(err);
	}

	client.close();

	console.log(response);
});
}