const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const apiaiApp = require('apiai')('00486919fdc14c738418d62ee543cbf5');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

/* Echoes the message back */
function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;
  let apiai = apiaiApp.textRequest(text, {
  	sessionId: 'my_chat'
  });


  apiai.on('response', (response) => {

  	switch (response.result.metadata.intentName) {
  		case 'buildingAge':
  			let responseText = "You want to know a building's age.";
  			break;
  		case 'welcome':
  			let responseText = "Nice to meet you!";
  			break;
  		defualt: 
  			let responseText = "I don't understand your message.";
  	}

//  	let atiText = response.result.fulfillment.speech;

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