import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const dbConfig = {
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	server: process.env.DB_SERVER || "localhost",
	database: process.env.DB_NAME,
	port: parseInt(process.env.DB_PORT) || 1433,
	options: {
		encrypt: false,
		trustServerCertificate: true,
	},
	pool: {
		max: 10,
		min: 0,
		idleTimeoutMillis: 30000,
	},
};

let poolPromise = null;

export async function getPool() {
	if (!poolPromise) {
		poolPromise = sql.connect(dbConfig);
	}
	return poolPromise;
}

export { sql };
