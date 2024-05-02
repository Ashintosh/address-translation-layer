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
     * @param plainText
     * @param [algorithm='sha256']
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
     * @param plainText
     * @param [options={type: argon2.argon2id}]
     * @return {Promise<string>}
     */
    static async argonHash(plainText, options= {type: argon2.argon2id}) {
        return await argon2.hash(plainText, options);
    }

    /**
     * Verify argon hash from provided plaintext and ciphertext
     * @param plainText
     * @param cipherText
     * @param options
     * @return {Promise<boolean>}
     */
    static async verifyArgonHash(plainText, cipherText, options= undefined) {
        if (!(plainText && cipherText)) {
            return false;
        }

        return await argon2.verify(cipherText, plainText, options);
    }

    /**
     * Encrypt provided string using provided key
     * @param plainText
     * @param cipherKey
     * @param {boolean} format
     * @param algorithm
     * @param inputEncoding
     * @param outputEncoding
     * @return {{SALT: string, TAG: string, CIPHERTEXT: string, IV: string}|string}
     */
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

    /**
     * Decrypt provided string using provided key
     * @param formattedCipherText
     * @param cipherKey
     * @param algorithm
     * @param inputEncoding
     * @param outputEncoding
     * @return {string}
     */
    static decrypt(formattedCipherText, cipherKey, algorithm= 'aes-256-gcm', inputEncoding= 'base64', outputEncoding= 'utf8') {
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
     * @param ivBuffer
     * @param cipherTextBuffer
     * @param saltBuffer
     * @param tagBuffer
     * @param encoding
     * @return {string}
     */
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

    /**
     * Unformat cipher data from one base64 string
     * @param cipherFormat
     * @param hasTag
     * @param encoding
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