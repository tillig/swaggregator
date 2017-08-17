// Code based on swagger-combined from
// https://github.com/thanhson1085/swagger-combined/
// Updated to support PCF and not proxy data; should
// be hosted behind the API gateway instead.
var config = require('config');
var express = require('express');
var app = express();
var q = require('q');
var request = require('request');

// Use X-Forwarded-* headers.
app.enable("trust proxy");

// Turn off the Express header.
app.disable("x-powered-by");

// Add CORS header middleware.
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	next();
});

var allSwaggerSettings = config.get("documents");
var getSwaggerDocuments = function(settings){
	var the_promises = [];
	settings.forEach(function(setting){
		var def = q.defer();

		// Turned off cert validation because a lot of internal
		// and self-signed certs are in place behind the gateway.
		var docRequest = {
			"rejectUnauthorized": false,
			"url": setting.swagger_url
		};
		request(docRequest, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				console.log("Downloaded Swagger from %s", setting.swagger_url);
				body = { "settings": setting, "document": JSON.parse(body) };
				def.resolve(body);
			}
			else {
				console.log("Failed to download Swagger from %s: %s", setting.swagger_url, error);
			}
		});
		the_promises.push(def.promise);
	});
	return q.all(the_promises);
}

// Recursively updates a JSON object
// objectToSearch = object to recurse and update
// updater = function that takes the object and performs updates/checks if any
var updateJsonObject = function(objectToSearch, updater){
	if (!objectToSearch) {
		return;
	}

	try {
		if (Array.isArray(objectToSearch)) {
			for (var i = 0; i < objectToSearch.length; i++)
			{
				updateJsonObject(objectToSearch[i], updater);
			}
		}
		else if (typeof objectToSearch === "object") {
			updater(objectToSearch);
			for (var property in objectToSearch) {
				if (objectToSearch.hasOwnProperty(property)) {
					updateJsonObject(objectToSearch[property], updater);
				}
			}
		}
	}
	catch (e) {
		console.log("Error recursing/updating JSON document: " + e);
	}
}

// TODO: Hide the "Explore" box in the Swagger header.
// TODO: Configure OAuth for the UI.
// TODO: Configure logo and header for the UI.
app.get('/swagger', function(req, res) {
	res.redirect("/swagger/ui");
});
app.use('/swagger/ui', express.static(__dirname + '/static/'));
app.get('/swagger/ui/swagger.json', function(req, res) {
	var schemes = [ req.protocol ];
	getSwaggerDocuments(allSwaggerSettings).then(function(allDocuments){
		var baseDocument = {
			"swagger": "2.0",
			"info": config.get("info"),
			"host": null,
			"basePath": null,
			"schemes": schemes,
			"paths": {},
			"definitions": {}
		};
		var combinedDocument = allDocuments.reduce(function(accumulator, currentValue){
			if (!accumulator) {
				console.log("Initializing base document accumulator.");
				accumulator = Object.assign({}, baseDocument);
			}

			if (!currentValue.document) {
				console.log("No document retrieved for %s", currentValue.settings.id);
				return accumulator;
			}

			// Update IDs for the nested doc.
			console.log("Updating references and operation IDs for %s", currentValue.settings.id);
			var refDefinitionRe = /(#\/definitions\/)(.+)/
			updateJsonObject(
				currentValue.document,
				function(doc) {
					if (doc.hasOwnProperty("$ref")) {
						// Convert $ref to "#/definitions/Account" to "#/definitions/id__Account"
						// Use double-underscores because slash has a JSON path meaning.
						doc["$ref"] = doc["$ref"].replace(refDefinitionRe, "$1[" + currentValue.settings.id + "]$2");
					}
					if (doc.hasOwnProperty("operationId")) {
						doc["operationId"] = currentValue.settings.id + "$" + doc["operationId"];
					}
				});

			// Rewrite paths and combine into the document.
			console.log("Adding paths from %s", currentValue.settings.id);
			for (var p in currentValue.document.paths){
				var updated = p;
				if (currentValue.settings.path_rewrite) {
					for(var rewriteSearch in currentValue.settings.path_rewrite) {
						updated = updated.replace(new RegExp(rewriteSearch), currentValue.settings.path_rewrite[rewriteSearch]);
					}
				}

				if (accumulator.paths[updated]) {
					console.log("Duplicate path encountered at " + updated);
					console.log("Path from " + currentValue.settings.id + " at " + p);
					console.log("Existing path:");
					console.log(JSON.stringify(accumulator.paths[updated]));
					console.log("Incoming path:");
					console.log(JSON.stringify(currentValue.document.paths[p]));
				}

				accumulator.paths[updated] = currentValue.document.paths[p];
			}

			// Add object definition "Account" as "id__Account" to match "$ref" updates.
			console.log("Adding object definitions from %s", currentValue.settings.id);
			for (var d in currentValue.document.definitions){
				accumulator.definitions["[" + currentValue.settings.id + "]" + d] = currentValue.document.definitions[d];
			}

			return accumulator;
		}, false);

		console.log("Sending complete aggregate Swagger doc.");
		res.setHeader('Content-Type', 'application/json');
		res.send(JSON.stringify(combinedDocument));
	});
});

var port = process.env.PORT || 3000;
var server = app.listen(port, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log("Swaggregator now listening on http://%s:%s", host, port);
});
