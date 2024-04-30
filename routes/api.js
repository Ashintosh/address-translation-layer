const express = require('express');
const router = express.Router();

const Database = require('../utils/database');
const Crypto = require('../utils/crypto');

// Check if valid ID and access key was provided
router.use(async function (req, res, next) {
   if (!req.headers.authorization) {
       return res.status(401).json({
           result: false,
           status: 'INV_AUTH',
           message: 'Unauthorized'
       });
   }

   const secretId = req.body.secretId;
   const secretKey = req.body.secretKey;

   const database = new Database();

   const query = "SELECT name, key FROM htl_translations.api_keys WHERE name = $1";
   const queryValues = [secretId];
   const postRes = database.execute(query, queryValues);

   const dbSecretKey = postRes['key'];



   if (! await Crypto.verifyArgonHash(secretKey, dbSecretKey)
       .then(function (hash) { return hash })) {

   }

   next();
});

router.get('/', function(req, res, next) {
    res.send('Please provide a resource.');
});

// Add identifier to translation db
router.post('/translation', function(req, res, next) {
    const accessKey = req.headers['x-access-key'];
    const userId = req.headers['x-user-id'];

    
});


module.exports = router;
