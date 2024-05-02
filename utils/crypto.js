const crypto = require('crypto');
const argon2 = require('argon2');

class Crypto {
    static #IV_SIZE = 16;
    static #SALT_SIZE = 16;
    static #KEY_SIZE = 32;

    /**
     * Generate a random string using the crypto.randomInt method
     * @param {number} [size=16]
     * @returns {string}
     */
    static randomString(size= 16) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = String();

        while (result.length < size) {
            result += charset[crypto.randomInt(charset.length)];
        }

        return result;
    }

    /**
     * Creates has from provided plaintext
     * @param {string} plainText
     * @param {string} [algorithm='sha256']
     * @param [encoding='hex']
     * @return {string}
     */
    static hash(plainText, algorithm= 'sha256', encoding= 'hex') {
        return crypto.createHash(algorithm)
            .update(plainText)
            .digest(encoding);
    }

    /**
     * Creates argon hash from provided plaintext
     * @param {string} plainText
     * @param {Object} [options]
     * @param {number} [options.type=argon2.argon2id]
     * @param {Buffer} [options.secret=undefined]
     * @param {number} [options.memoryCost=65536]
     * @param {number} [options.hashLength=32]
     * @param {number} [options.parallelism=4]
     * @param {Buffer} [options.associatedData=undefined]
     * @return {Promise<string>}
     */
    static async argonHash(plainText, options= {}) {
        const defaultOptions = {
            type: argon2.argon2id,
            secret: undefined,
            memoryCost: 2 ** 16,
            hashLength: 32,
            parallelism: 4,
            associatedData: undefined
        };

        const {
            type = defaultOptions.type,
            secret = defaultOptions.secret,
            memoryCost = defaultOptions.memoryCost,
            hashLength = defaultOptions.hashLength,
            parallelism = defaultOptions.parallelism,
            associatedData = defaultOptions.associatedData
        } = options;

        return await argon2.hash(plainText, {
            type, secret, memoryCost, hashLength, parallelism, associatedData
        });
    }

    /**
     * Verify argon hash from provided plaintext and ciphertext
     * @param {string} plainText
     * @param {string} cipherText
     * @param {Object} [options]
     * @param {Buffer} [options.secret=undefined]
     * @return {Promise<boolean>}
     */
    static async verifyArgonHash(plainText, cipherText, options= {}) {
        if (!(plainText && cipherText)) {
            return false;
        }

        const defaultOptions = { secret: undefined };
        const { secret = defaultOptions.secret } = options;

        return await argon2.verify(cipherText, plainText, secret);
    }

    /**
     * Encrypt provided string using provided key
     * @param {string} plainText
     * @param {string} cipherKey
     * @param {Object} [options]
     * @param {boolean} [options.format=false]
     * @param {string} [options.algorithm='aes-256-gcm']
     * @param {string} [options.inputEncoding='utf8']
     * @param {string} [options.outputEncoding='base64']
     * @return {{SALT: string, TAG: string, CIPHERTEXT: string, IV: string}|string}
     */
    static encrypt(plainText, cipherKey, options= {})  {
        const defaultOptions = {
            format: false,
            algorithm: 'aes-256-gcm',
            inputEncoding: 'utf8',
            outputEncoding: 'base64'
        };

        const {
            format = defaultOptions.format,
            algorithm = defaultOptions.algorithm,
            inputEncoding = defaultOptions.inputEncoding,
            outputEncoding = defaultOptions.outputEncoding,
        } = options;

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

    /**
     * Decrypt provided string using provided key
     * @param {string} formattedCipherText
     * @param {string} cipherKey
     * @param {Object} [options]
     * @param {string} [options.algorithm='aes-256-gcm']
     * @param {string} [options.inputEncoding='base64']
     * @param {string} [options.outputEncoding='utf8']
     * @return {string}
     */
    static decrypt(formattedCipherText, cipherKey, options= {}) {
        const defaultOptions = {
            algorithm: 'aes-256-gcm',
            inputEncoding: 'base64',
            outputEncoding: 'utf8'
        };

        const {
            algorithm = defaultOptions.algorithm,
            inputEncoding = defaultOptions.inputEncoding,
            outputEncoding = defaultOptions.outputEncoding,
        } = options;

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
        const key = crypto.pbkdf2Sync(cipherKey, salt, 60000, Crypto.#KEY_SIZE, 'sha256');

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(tag);

        let plainText = decipher.update(cipherText, inputEncoding, outputEncoding);
        plainText += decipher.final(outputEncoding);

        return plainText.toString();
    }

    /**
     * Format cipher data into one base64 string
     * @param {Buffer} ivBuffer
     * @param {Buffer} cipherTextBuffer
     * @param {Buffer} saltBuffer
     * @param {false|Buffer} [tagBuffer=false]
     * @param [encoding='base64']
     * @return {string}
     */
    static #formatCipher(ivBuffer, cipherTextBuffer, saltBuffer, tagBuffer= false, encoding= 'base64') {
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

    /**
     * Unformat cipher data from one base64 string
     * @param {string} cipherFormat
     * @param {boolean} [hasTag=false]
     * @param [encoding='base64']
     * @return {{SALT: Buffer, CIPHERTEXT: Buffer, IV: Buffer}}
     */
    static #unformatCipher(cipherFormat, hasTag= false, encoding= 'base64') {
        const cipherBuffers = Buffer.from(cipherFormat, encoding);
        const tagLength = 16;

        const ivBuffer = cipherBuffers.subarray(0, Crypto.#IV_SIZE);
        const cipherTextBuffer = cipherBuffers.subarray(
            Crypto.#IV_SIZE, cipherBuffers.length - (tagLength || 0) - Crypto.#SALT_SIZE
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