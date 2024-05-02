const express = require('express');
const router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('Respond with a resource');
});

// Render create account form
router.get('/create', function(req, res, next) {

});

// Add user to database
router.post('/', async function(req, res, next) {


});

// Get user info from database
router.get('/', async function(req, res, next) {

});

module.exports = router;
