const MongoClient = require('mongodb').MongoClient;

/* Connecting to the MongoDB database for information */
const url = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DBNAME}`;
const dbName = process.env.MONGO_DBNAME;

module.exports = async function (apiaiObj, apiaiClient) {
    switch (apiaiObj.result.metadata.intentName) {
        case 'buildingAge': {

            let queryResult = await buildingQuery(apiaiObj.result.parameters.vt_building);

           /*let clientResponse = apiaiClient.post('/query', {
                event: {
                    name: "customEvent",
                    data: {
                        buildingAge: ageInYears(queryResult.start)
                    }
                },
                sessionId: "myChat",
                lang: "en"
            });

           clientResponse.on('response', (res) => {
               return res.fulfillment.speech;
           });

            clientResponse.on('error', (error) => {
                console.log(error);
            });

            clientResponse.end();*/

            if (queryResult && ageInYears(queryResult.start) !== -1) {
                return `Construction of ${queryResult.name} was started in ${queryResult.start} making the building ${ageInYears(queryResult.start)} years old.`;
            } else {
                return `I am sorry. An error occurred and I was unable to find that. Please try again.`;
            }

        } break;

        case 'buildingAddress': {
            let queryResult = await buildingQuery(apiaiObj.result.parameters.vt_building);

            if (queryResult) {
                return `Mail for ${queryResult.name} can be sent to: \n\n${queryResult.address}\n\nPlease contact the recipient however to ensure mail specifics though.`;
            } else {
                return `I am sorry. An error occurred and I was unable to find that. Please try again.`
            }
        } break;

        case 'mapLocation': {
            let queryResult = await buildingQuery(apiaiObj.result.parameters.vt_building);

            if (queryResult) {
                return `${queryResult.name} can be found in cell ${queryResult.mapGrid} on this map:\n\n http://www.maps.vt.edu/PDF/campus-map-highres.pdf`;
            } else {
                console.log('Here instead');
                return `I am sorry. An error occurred and I was unable to find that. Please try again.`;
            }
        } break;

        case 'officeContact': {
            return `Got to the officeContact case`;
        } break;

        default: {
            return apiaiObj.result.fulfillment.speech;
        }
    }
};

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