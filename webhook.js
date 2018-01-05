/* The necessary modules to function being declared */
const dotenv = require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const apiaiApp = require('apiai')(process.env.APIAI_KEY);
const MongoClient = require('mongodb').MongoClient;

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

  let responseText; // the variable that will hold the text to send back


  apiai.on('response', async (response) => {

  	/* Creating the response based off the intentName in the JSON */
  	switch (response.result.metadata.intentName) {
  		case 'buildingAge': {

            // Calling the query to find the building and return that object from the database
            let queryResult = await buildingQuery(response.result.parameters.vt_building);

            /*if (queryResult && ageInYears(queryResult.start) !== -1) {
                responseText = `Construction of ${queryResult.name} was started in ${queryResult.start} making the building ${ageInYears(queryResult.start)} years old.`;
            } else {
                responseText = `I am sorry. An error occurred and I was unable to find that. Please try again.`
            }
            */

            let age = ageInYears(queryResult.start);
            let paramResponse = apiaiApp.textRequest('test', {
               event: {
                   name: 'customEvent',
                   data: {
                       buildingAge: age
                   }
               },
               sessionId: 'my_chat'
            })
            .then(() => {
                console.log('');
                console.log('ParamResponse:');
                console.log(paramResponse);
                console.log('');})
            .then((response) => {
                console.log('');
                console.log('response inside event handler:');
                console.log(response);
                console.log('');
                responseText = response.result.fulfillment.speech;})
            .catch((error) => {
                console.log(error);});

            paramResponse.end();

            /*paramResponse.on('response', (response) => {

            });

            paramResponse.on('error', (error) => {
                console.log(error);
            });*/




            /*if (paramResponse) {
                responseText = paramResponse.result.fulfillment.speech;
            } else {
                responseText = "Didn't have a paramResponse";
            }*/
        } break;

        case 'buildingAddress': {
            let queryResult = await buildingQuery(response.result.parameters.vt_building);

            if (queryResult) {
                responseText = `Mail for ${queryResult.name} can be sent to: \n\n${queryResult.address}\n\nPlease contact the recipient however to ensure mail specifics though.`;
            } else {
                responseText = `I am sorry. An error occurred and I was unable to find that. Please try again.`
            }
        } break;

        case 'mapLocation': {
            let queryResult = await buildingQuery(response.result.parameters.vt_building);

            if (queryResult) {
                responseText = `${queryResult.name} can be found in cell ${queryResult.mapGrid} on this map:\n\n http://www.maps.vt.edu/PDF/campus-map-highres.pdf`;
            } else {
                console.log('Here instead');
                responseText = `I am sorry. An error occurred and I was unable to find that. Please try again.`;
            }
        } break;

  		default: {
            responseText = response.result.fulfillment.speech;
        }
  	}

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

/* Connects to the MongoDB and queries the buildings
	database to find and return the desired building

	 params: query  the query that should be performed
	         coll   the collection to be looked in
	 returns: the object that the query finds
	 */
async function databaseQuery(coll, query) {
	try {
		const client = await MongoClient.connect(url);
		const db = client.db(dbName);
		const buildings = db.collection(coll);
		const response = await buildings.findOne(query);
		client.close();
		return response;
	} catch (err) {
		console.log(err);
	}
}

/*
    Specifically queries buildings returning the object for the requested id

    params: id  the building id that should be looked for
    returns: the building object queried
 */
function buildingQuery(buildingId) {
    return databaseQuery('buildings', {id: buildingId});
}

/*
    Calculates the age of something in years based of the given year
    Returns -1 if the calculation is not correct and the
    building age is negative

    params: startYear   the year it was started
    return: the age in years
 */
function ageInYears(startYear) {
    const currentYear = new Date().getFullYear();

    if (!Number.isInteger(startYear) || startYear > currentYear) {
        return -1;
    } else {
        return currentYear - startYear;
    }

}