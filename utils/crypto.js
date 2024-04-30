const crypto = require('crypto');
const argon2 = require('argon2');

class Crypto {
    static #IV_SIZE = 16;
    static #SALT_SIZE = 16;
    static #KEY_SIZE = 32;
    static #DEFAULT_PEPPER = '0o9QpbMkeap2nm8q';

    /*
    constructor() {
        this.IV_SIZE   = 16;
        this.SALT_SIZE = 16;
        this.KEY_SIZE  = 32;

        this.DEFAULT_PEPPER = '0o9QpbMkeap2nm8q';
    }

     */

    static randomString(size= 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = String();

        while (result.length < size) {
            result += charset[crypto.randomInt(charset.length)];
        }

        return result;
    }

    static hash(plainText, algorithm= 'sha256', encoding= 'hex') {
        return crypto.createHash(algorithm)
            .update(plainText)
            .digest(encoding);
    }

    static async argonHash(
        plainText,
        pepper      = null,
        algorithm   = 'argon2id',
        timeCost   = 10,
        memoryCost = 2**16,
        parallelism= 4,
        hashLength = 64,
        saltLength = 16
    ) {

        const argonTypes = {
            'argon2d': argon2.argon2d,
            'argon2i': argon2.argon2i,
            'argon2id': argon2.argon2id
        };

        return await argon2.hash(plainText, {
            type: argonTypes[algorithm], // default: 'argon2id'
            timeCost: timeCost,          // default: 4
            memoryCost: memoryCost,      // default: 2**6 (65536)
            parallelism: parallelism,    // default: 4
            hashLength: hashLength,      // default: 50
            saltLength: saltLength,      // default: 16
            secret: Buffer.from(pepper)  // default: NULL
        });
    }

    static async verifyArgonHash(plainText, cipherText, pepper= null) {
        return await argon2.verify(cipherText, plainText, {
            secret: Buffer.from(pepper)
        });
    }

    static encrypt(plainText, cipherKey, format= false, algorithm= 'aes-256-gcm', inputEncoding= 'utf8', outputEncoding= 'base64')  {
        const iv = crypto.randomBytes(Crypto.#IV_SIZE);
        const salt = crypto.randomBytes(Crypto.#SALT_SIZE);
        const key = crypto.pbkdf2Sync(cipherKey, salt, 60000, Crypto.#KEY_SIZE, 'sha256');
        const cipher = crypto.createCipheriv(algorithm, key, iv);

        let cipherText = cipher.update(plainText, inputEncoding, outputEncoding);
        cipherText += cipher.final(outputEncoding);
        const tag = cipher.getAuthTag();

        if (format) {
            return this.#formatCipher(iv, cipherText, salt, tag);
        }

        return {
            CIPHERTEXT: Buffer.from(cipherText, outputEncoding).toString('hex'),
            IV: iv.toString('hex'),
            SALT: salt.toString('hex'),
            TAG: tag.toString('hex')
        };
    }

    static async decrypt(formattedCipherText, cipherKey, algorithm= 'aes-256-gcm', inputEncoding= 'base64', outputEncoding= 'utf8') {
        let cipherData, tag = null;

        if (algorithm === 'aes-256-gcm') {
            cipherData = Crypto.#unformatCipher(formattedCipherText, true);
            tag = cipherData.TAG;
        } else {
            cipherData = Crypto.#unformatCipher(formattedCipherText);
        }

        const iv = cipherData.IV;
        const salt = cipherData.SALT;

        const cipherText = cipherData.CIPHERTEXT;
        const key = crypto.pbkdf2Sync(cipherKey, salt, 60000, Crypto.KEY_SIZE, 'sha256');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(tag);

        let plainText = decipher.update(cipherText, inputEncoding, outputEncoding);
        plainText += decipher.final(outputEncoding);

        return plainText;
    }

    static #formatCipher(ivBuffer, cipherTextBuffer, saltBuffer, tagBuffer= false | '', encoding= 'base64') {
        let cipherBuffers = [
            Buffer.from(ivBuffer),
            Buffer.from(cipherTextBuffer, encoding),
            Buffer.from(saltBuffer)
        ];

        if (tagBuffer) {
            cipherBuffers.push(Buffer.from(tagBuffer));
        }

        return Buffer.concat(cipherBuffers).toString(encoding);
    }

    static #unformatCipher(cipherFormat, hasTag= false, encoding= 'base64') {
        const cipherBuffers = Buffer.from(cipherFormat, encoding);
        const tagLength = 16;

        const ivBuffer = cipherBuffers.subarray(0, Crypto.#IV_SIZE);
        const cipherTextBuffer = cipherBuffers.subarray(
            Crypto.IV_SIZE, cipherBuffers.length - (tagLength || 0) - Crypto.#SALT_SIZE
        );
        const saltBuffer = cipherBuffers.subarray(
            cipherBuffers.length - (tagLength || 0) - Crypto.#SALT_SIZE, cipherBuffers.length - (tagLength || 0)
        );

        let result = {
            CIPHERTEXT: cipherTextBuffer,
            IV: ivBuffer,
            SALT: saltBuffer
        }

        if (hasTag) {
            result.TAG = cipherBuffers.subarray(cipherBuffers.length - tagLength);
        }

        return result;
    }
}

module.exports = Crypto;