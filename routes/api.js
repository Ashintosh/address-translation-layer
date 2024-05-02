const express = require('express');
const router = express.Router();

const Crypto = require('../utils/crypto');

/**
 * Checks provided access key against database for validation. Prevents unauthorized access.
 */
router.use(async function (req, res, next) {
    if (!req.body?.projectID) return formatStatus(res, 400, false, 'ERR', 'Bad Request');

    try {
        var dbGetAccessKeyResult = await req.app.get('database').execute([{
            query: "SELECT key FROM htl_translations.api_keys WHERE name = $1",
            values: [req.body['projectID']]
        }]);
    } catch (Err) {
        console.log("Error: ", Err);
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    const accessKeyHash = (dbGetAccessKeyResult[0].rowCount > 0) ? dbGetAccessKeyResult[0].rows[0]['key'] : undefined;
    if (!await Crypto.verifyArgonHash(req.get('Authorization'), accessKeyHash)) {
        return formatStatus(res, 401, false, 'INV_AUTH', 'Unauthorized');
    }

    next(); // Continue
});

/**
 * Adds identifier and address to translation database
 */
router.post('/translation', async function(req, res, next) {
    const requiredConditions = [
        req.body?.identifier,
        req.body?.address
    ];

    if (!requiredConditions.every(condition => condition)) {
        return formatStatus(res, 400, false, 'ERR', 'Bad Request');
    }

    const key =  Crypto.hash(req.get('Authorization') + req.body['projectID'], 'sha256');
    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');
    const encryptedAddress = Crypto.encrypt(req.body['address'], key, {format: true});

    let addressData = {};
    addressData[req.body['projectID']] = encryptedAddress;

    try {
        const conflictResult = await req.app.get('database').execute([{
            query: "INSERT INTO htl_translations.identifiers (identifier, address_data) VALUES ($1, $2) ON CONFLICT (identifier) DO NOTHING",
            values: [identifierHash, addressData]
        }]);

        if (conflictResult[0].rowCount < 1) {
            return formatStatus(res, 200, false, 'DUPLICATE', 'Identifier already exists in database');
        }
    } catch (Err) {
        console.log("Error: ", Err);
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    return formatStatus(res, 200, true, 'POSTED', 'Identifier added to database');
});

/**
 * Gets address from translation database
 */
router.get('/translation', async function(req, res, next) {
    if (!req.body?.identifier) return formatStatus(res, 400, false, 'ERR', 'Bad Request');

    const key =  Crypto.hash(req.get('Authorization') + req.body['projectID'], 'sha256');
    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');

    try {
        var dbGetAddressResult = await req.app.get('database').execute([{
            query: "SELECT address_data FROM htl_translations.identifiers WHERE identifier = $1",
            values: [identifierHash]
        }]);

        if (dbGetAddressResult[0].rowCount < 1) {
            return formatStatus(res, 200, false, 'INVALID', 'Identifier not found in database');
        }
    } catch (Err) {
        console.log("Error: ", Err);
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    const dbAddressData = (dbGetAddressResult[0].rowCount > 0) ? dbGetAddressResult[0].rows[0]['address_data'] : undefined;
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
    const requiredConditions = [
        req.body?.identifier,
        req.body?.new_identifier
    ];

    if (!requiredConditions.every(condition => condition)) {
        return formatStatus(res, 400, false, 'ERR', 'Bad Request');
    }

    const currentIdentifierHash = Crypto.hash(req.body['identifier'], 'sha256');
    const newIdentifierHash = Crypto.hash(req.body['new_identifier'], 'sha256');

    try {
        await req.app.get('database').execute([{
            query: "UPDATE htl_translations.identifiers SET identifier = $1 WHERE identifier = $2",
            values: [newIdentifierHash, currentIdentifierHash]
        }]);
    } catch (Err) {
        console.log("Error: ", Err);
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    return formatStatus(res, 200, true, 'POSTED', 'Identifier updated in database');
});

/**
 * Deletes identifier in translation database
 */
router.delete('/translation/identifier', async function(req, res, next) {
    if (!req.body?.identifier) return formatStatus(res, 400, false, 'ERR', 'Bad Request');

    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');

    try {
        await req.app.get('database').execute([{
            query: "DELETE FROM htl_translations.identifiers WHERE identifier = $1",
            values: [identifierHash]
        }]);
    } catch (Err) {
        console.log("Error: ", Err);
        return formatStatus(res, 500, false, 'ERR', 'Internal Server Error');
    }

    return formatStatus(res, 200, true, 'DELETED', 'Identifier deleted from database');
});


/**
 * Updates existing address in translation database
 */
router.post('/translation/address', async function(req, res, next) {
    const requiredConditions = [
        req.body?.identifier,
        req.body?.address
    ];

    if (!requiredConditions.every(condition => condition)) {
        return formatStatus(res, 400, false, 'ERR', 'Bad Request');
    }

    const key =  Crypto.hash(req.get('Authorization') + req.body['projectID'], 'sha256');
    const identifierHash = Crypto.hash(req.body['identifier'], 'sha256');
    const encryptedAddress = Crypto.encrypt(req.body['address'], key, {format: true});

    try {
        await req.app.get('database').execute([{
            query: "UPDATE htl_translations.identifiers SET address_data[$1] = $2 WHERE identifier = $3",
            values: [req.body['projectID'], `"${encryptedAddress}"`, identifierHash]
        }]);
    } catch (Err) {
        console.log("Error: ", Err);
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
        await req.app.get('database').execute([{
            query: "UPDATE htl_translations.identifiers SET address_data = address_data - $1 WHERE identifier = $2",
            values: [req.body['projectID'], identifierHash]
        }]);
    } catch (Err) {
        console.log("Error: ", Err);
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
