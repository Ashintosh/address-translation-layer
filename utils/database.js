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
            process.exit(-1);
        });
    }

    /**
     * Execute Postgresql query with optional values
     * @param {string} queryString
     * @param {array|null} [queryValues=null]
     * @return {Promise<*[]>}
     */
    async execute(queryString, queryValues= null) {
        const client = await this.pool.connect()
            .catch(err => { console.error('DB Pool Error:', err) });

        let res;

        // Execute multiple query strings if an array is provided
        if (Array.isArray(queryString)) {
            res = [];
            for (const query of queryString) {
                res.push(
                    await client?.query(query, queryValues)
                        .catch(err => { console.error('DB Query Error:', err); })
                );
            }
        } else {
            res = await client?.query(queryString, queryValues)
                .catch(err => { console.error('DB Query Error:', err);  });
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