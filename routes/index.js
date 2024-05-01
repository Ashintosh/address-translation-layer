var express = require('express');
var router = express.Router();

const Crypto = require('../utils/crypto');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'address-translation-api' });
});

module.exports = router;
