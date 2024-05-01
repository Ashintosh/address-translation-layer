const express = require('express');
const router = express.Router();

const Database = require('../utils/database');
const Crypto = require('../utils/crypto');

// Check if valid ID and access key was provided
router.use(async function (req, res, next) {
   if (typeof req.get('authorization') === 'undefined') {
       return res.status(401).json({
           result: false,
           status: 'INV_AUTH',
           message: 'Unauthorized'
       });
   }

   const projectID = req.body['projectID'].toString();
   const accessKey = req.get('Authorization');

   const database = new Database();

   const query = "SELECT name, key FROM htl_translations.api_keys WHERE name = $1";
   const queryValues = [projectID];
   const postRes = await database.execute(query, queryValues);

   // This absolutely disgusting line of code needs to go
   // TODO: Refactor database util to handle errors more gracefully. Throw invalid auth response instead of TypeError when projectID is not valid.
   const dbAccessKey = (typeof postRes.rows[0]['key'] === 'undefined') ? undefined : postRes.rows[0]['key'];

    if (typeof dbAccessKey === 'undefined') {
        return res.status(401).json({
            result: false,
            status: 'INV_AUTH',
            message: 'Unauthorized'
        });
    }

   if (! await Crypto.verifyArgonHash(accessKey, dbAccessKey)
       .then(function (hash) { return hash })) {
       return res.status(401).json({
           result: false,
           status: 'INV_AUTH',
           message: 'Unauthorized'
       });
   } else {
       return res.status(200).json({
           result: true,
           status: 'AUTHED',
           message: 'Valid auth'
       });
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
