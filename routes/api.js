const express = require('express');
const router = express.Router();

const Database = require('../utils/database');
const Crypto = require('../utils/crypto');

// Check if valid ID and access key was provided
router.use(async function (req, res, next) {
    let authenticated = false;

    const projectID = req.body['projectID'];
    const accessKey = req.get('Authorization');

    const database = req.app.get('database');
    const query = "SELECT key FROM htl_translations.api_keys WHERE name = $1";
    const queryValues = [projectID];
    const postRes = await database.execute(query, queryValues);

    const accessKeyHash = (postRes.rowCount > 0) ? postRes.rows[0]['key'] : undefined;
    authenticated = (await Crypto.verifyArgonHash(accessKey, accessKeyHash));

    if (!authenticated) {
        return res.status(401).json({
            result: false,
            status: 'INV_AUTH',
            message: 'Unauthorized'
        });
    }

    next();
});

router.get('/', function(req, res, next) {
    res.send('Please provide a resource.');
});

// Add identifier to translation db
router.post('/translation', async function(req, res, next) {
    const identifier = req.body['identifier'];
    const address = req.body['address'];
    const key =  Crypto.hash(req.get('Authorization') + identifier, 'sha256');
    const projectID = req.body['projectID'];

    const identifierHash = Crypto.hash(identifier, 'sha256');
    const encryptedAddress = Crypto.encrypt(address, key, true);

    let addressData = {};
    addressData[projectID] = encryptedAddress;

    const database = req.app.get('database');
    const query = "INSERT INTO htl_translations.identifiers (identifier, address_data) VALUES ($1, $2)";
    const queryValues = [identifierHash, addressData];
    const postRes = await database.execute(query, queryValues);

    // TODO: Return status to client
});

// Pull identifier from translation db
router.get('/translation', async function(req, res, next) {
    const identifier = req.body['identifier'];
    const key =  Crypto.hash(req.get('Authorization') + identifier, 'sha256');
    const projectID = req.body['projectID'];
    const identifierHash = Crypto.hash(identifier, 'sha256');

    const database = req.app.get('database');
    const query = "SELECT address_data FROM htl_translations.identifiers WHERE identifier = $1";
    const queryValues = [identifierHash];
    const postRes = await database.execute(query, queryValues);

    const dbAddressData = (postRes.rowCount > 0) ? postRes.rows[0]['address_data'] : undefined;

    if (!dbAddressData) {
        return res.status(200).json({
            result: false,
            status: 'INV_ID',
            message: 'Invalid identifier.'
        });
    }

    const addressData = await Crypto.decrypt(dbAddressData[projectID], key);

    // TODO: Return status to client
});


module.exports = router;
