var express = require('express');
var path = require('path');
var logger = require('morgan');

var index = require('./routes/index');
var swaggerjson = require('./routes/swaggerjson');

var app = express();

// Use X-Forwarded-* headers.
app.enable("trust proxy");

// Turn off the Express header.
app.disable("x-powered-by");

// View engine setup.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Request logging in short format, which works well for PCF.
app.use(logger('short'));

// Add CORS header middleware.
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	next();
});

// Redirect people to get to the Swagger docs by default.
app.get('/', function(req, res) {
	res.redirect("/swagger/ui");
});
app.get('/swagger', function(req, res) {
	res.redirect("/swagger/ui");
});

// Get the dynamic content first, otherwise use static content.
app.use('/swagger/ui/swagger.json', swaggerjson);
app.use('/swagger/ui', index);
app.use('/swagger/ui', express.static(path.join(__dirname, 'public')));

// Catch 404 and forward to error handler.
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// Error handler.
app.use(function(err, req, res, next) {
	// Set locals, only providing error in development.
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// Render the error page.
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
