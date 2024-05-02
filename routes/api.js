const express = require('express');
const router = express.Router();

const Database = require('../utils/database');
const Crypto = require('../utils/crypto');

/**
 * Checks if valid ID and access key was provided
 */
router.use(async function (req, res, next) {
    try {
        var dbGetAccessKeyResult = await req.app.get('database').execute(
            "SELECT key FROM htl_translations.api_keys WHERE name = $1",
            [req.body['projectID']]
        );
    } catch (Err) {
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    const accessKeyHash = (dbGetAccessKeyResult.rowCount > 0) ? dbGetAccessKeyResult.rows[0]['key'] : undefined;

    if (!await Crypto.verifyArgonHash(req.get('Authorization'), accessKeyHash)) {
        return formatStatus(res, 401, false, 'INV_AUTH', 'Unauthorized');
    }

    next();
});

/**
 * Adds identifier and address to translation database
 */
router.post('/translation', async function(req, res, next) {
    const key =  Crypto.hash(req.get('Authorization') + req.body['projectID'], 'sha256');

    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');
    const encryptedAddress = Crypto.encrypt(req.body['address'], key, true);

    let addressData = {};
    addressData[req.body['projectID']] = encryptedAddress;

    try {
        await req.app.get('database').execute(
            "INSERT INTO htl_translations.identifiers (identifier, address_data) VALUES ($1, $2)",
            [identifierHash, addressData]
        );
    } catch (Err) {
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    return formatStatus(res, 200, true, 'POSTED', 'Identifier added to database');
});

/**
 * Gets address from translation database
 */
router.get('/translation', async function(req, res, next) {
    const key =  Crypto.hash(req.get('Authorization') + req.body['projectID'], 'sha256');
    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');

    try {
        var dbGetAddressResult = await req.app.get('database').execute(
            "SELECT address_data FROM htl_translations.identifiers WHERE identifier = $1",
            [identifierHash]
        );
    } catch (Err) {
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }


    const dbAddressData = (dbGetAddressResult.rowCount > 0) ? dbGetAddressResult.rows[0]['address_data'] : undefined;

    if (!dbAddressData) {
        return formatStatus(res, 200, false, 'INV_ID', 'Invalid identifier');
    }

    const addressData = Crypto.decrypt(dbAddressData[req.body['projectID']], key);
    return formatStatus(res, 200, true, addressData);
});


/**
 * Updates identifier in translation database
 */
router.put('/translation/identifier', async function(req, res, next) {
    const currentIdentifierHash = Crypto.hash(req.body['identifier'], 'sha256');
    const newIdentifierHash = Crypto.hash(req.body['new_identifier'], 'sha256');

    try {
        await req.app.get('database').execute(
            "UPDATE htl_translations.identifiers SET identifier = $1 WHERE identifier = $2",
            [newIdentifierHash, currentIdentifierHash]
        );
    } catch (Err) {
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    return formatStatus(res, 200, true, 'POSTED', 'Identifier updated in database');
});

/**
 * Deletes identifier in translation database
 */
router.delete('/translation/identifier', async function(req, res, next) {
    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');

    try {
        await req.app.get('database').execute(
            "DELETE FROM htl_translations.identifiers WHERE identifier = $1",
            [identifierHash]
        );
    } catch (Err) {
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    return formatStatus(res, 200, true, 'DELETED', 'Identifier deleted from database');
});


/**
 * Adds or updates existing address in translation database
 */
router.post('/translation/address', async function(req, res, next) {
    const key =  Crypto.hash(req.get('Authorization') + req.body['projectID'], 'sha256');
    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');
    const encryptedAddress = Crypto.encrypt(req.body['address'], key, true);

    try {
        await req.app.get('database').execute(
            "UPDATE htl_translations.identifiers SET address_data[$1] = $2 WHERE identifier = $3",
            [req.body['projectID'], `"${encryptedAddress}"`, identifierHash]
        );
    } catch (Err) {
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    return formatStatus(res, 200, true, 'UPDATED', 'Address updated in database');
});

/**
 * Deletes address in translation database
 */
router.delete('/translation/address', async function(req, res, next) {
    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');

    try {
        await req.app.get('database').execute(
            "UPDATE htl_translations.identifiers SET address_data = address_data - $1 WHERE identifier = $2",
            [req.body['projectID'], identifierHash]
        );
    } catch (Err) {
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    return formatStatus(res, 200, true, 'DELETED', 'Identifier deleted from database');
});


/**
 * Formats results into valid response
 * @param {express.Response} res
 * @param {number} code
 * @param {boolean} result
 * @param {*} status
 * @param {string} message
 * @returns {express.Response}
 */
function formatStatus(res, code, result, status, message= '') {
    return res.status(code).json({
        result: result,
        status: status,
        message: message
    });
}

module.exports = router;
