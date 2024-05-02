require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const {
    POSTGRES_HOST,
    POSTGRES_PORT,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD
} = process.env;

class Database {

    /**
     * Creates database connection pool with provided host credentials
     * (Defaults to ENV variables if no credentials provided on object declaration)
     * @param {string} [host]
     * @param {string} [port]
     * @param {string} [database]
     * @param {string} [user]
     * @param {string} [password]
     */
    constructor(host= POSTGRES_HOST, port= POSTGRES_PORT, database= POSTGRES_DB, user= POSTGRES_USER, password= POSTGRES_PASSWORD) {
        this.pool = new Pool({
            host:     host,
            port:     port,
            database: database,
            user:     user,
            password: password
        });

        this.pool.on('error', (err, client) => {
            console.error('DB Pool Error:', err);
            // process.exit(-1);
        });
    }

    /**
     * Execute Postgresql query with optional values
     * @param {Array<{query: string, values: array|undefined}>} queryData
     * @return {Promise<*[]>}
     */
    async execute(queryData) {
        const client = await this.pool.connect()

        let res = [];
        for (const {query, values} of queryData) {
            const queryValues = values || [];
            res.push(await client?.query(query, queryValues));
        }

        client?.release()
        return res;
    }

    /**
     * Close database client pool
     */
    async close() {
        console.log('Closing db connection pool...');
        await this.pool.end();
        console.log('Pool closed.');
    }
}

module.exports = Database;