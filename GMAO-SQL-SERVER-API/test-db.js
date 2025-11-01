import sql from "mssql";
import dotenv from "dotenv";

dotenv.config({ path: 'c:/Users/Mohamed/Desktop/my_db_schema/gmao-etat-api/.env' });

const dbConfig = {
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	server: process.env.DB_SERVER, // e.g. DESKTOP-D94MTGM\SQLEXPRESS
	database: process.env.DB_NAME,
	port: parseInt(process.env.DB_PORT) || 1433,
	options: {
		encrypt: false,
		trustServerCertificate: true,
	},
	connectionTimeout: 15000,
};

async function testConnection() {
	console.log(
		`🔍 Trying to connect to ${dbConfig.server}\\${dbConfig.database}...`
	);
	try {
		const pool = await sql.connect(dbConfig);
		const result = await pool.request().query("SELECT DB_NAME() AS currentDB");
		console.log("✅ Connected successfully to:", result.recordset[0].currentDB);
	} catch (err) {
		console.error("❌ Connection failed:", err.message);
	} finally {
		await sql.close();
	}
}

testConnection();
