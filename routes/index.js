var express = require('express');
var router = express.Router();
var config = require('config');

var info = config.get("info");
var oauth = config.get("oauth");

router.get('/', function(req, res, next) {
	res.render('index', { title: info.title, oauth: oauth });
});

module.exports = router;
