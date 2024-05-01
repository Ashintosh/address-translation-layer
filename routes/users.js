const express = require('express');
const router = express.Router();

const Database = require('../utils/database');
const Crypto = require('../utils/crypto');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// Render create account form
router.get('/create', function(req, res, next) {
  res.render('createAccount', { title: 'address-translation-layer' });
});

// Add user to database
router.post('/', async function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  //const cryptor = new Crypto();
  const pepper = Crypto.randomString(16);
  const password_hash = await Crypto.argonHash(password, pepper).then(function (hash) { return hash });

  const database = new Database();
  const query = "INSERT INTO htl_accounts.users (email, password, pepper) VALUES ($1, $2, $3)";
  const queryValues = [email, password_hash, pepper];

  const postRes = await database.execute(query, queryValues);

});

// Get user info from database
router.get('/', async function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  const database = new Database();
  const query = "SELECT * FROM htl_accounts.users WHERE email = $1";
  const queryValues = [email];

  const postRes = database.execute(query, queryValues);

  const userData = {
    id: postRes['id'],
    email: postRes['email'],
    password: postRes['password'],
    pepper: postRes['pepper'],
    projects: postRes['projects'],
    date: postRes['date']
  };

  if (! await Crypto.verifyArgonHash(password, userData.password, userData.pepper)) {
    res.send(JSON.stringify({
      result: false,
      reason: 'INV-PASS',
      message: 'Invalid password'
    }));

    return;
  }

});

module.exports = router;
