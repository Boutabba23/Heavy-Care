import express from "express";
import { getPool, sql } from "./db.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// 🟢 POST: Add new Etat_Journée
router.post("/api/etat", async (req, res) => {
	const {
		date,
		codeMateriel,
		chantier,
		etat_journ,
		quantite_carburant,
		quantite_lubrifiant,
		h_service,
		h_panne,
		h_chomage,
		compteur,
	} = req.body;

	if (!codeMateriel)
		return res.status(400).json({ error: "codeMateriel is required" });

	try {
		const pool = await getPool();

		// ✅ Check machine exists
		const check = await pool
			.request()
			.input("codeMat", sql.VarChar(50), codeMateriel)
			.query(
				"SELECT COUNT(1) AS cnt FROM Matériel WHERE Code_matériel_nouveau = @codeMat"
			);

		if (!check.recordset[0].cnt) {
			return res
				.status(400)
				.json({ error: `Machine ${codeMateriel} not found` });
		}

		// ✅ Get chantier if not provided
		let chantierCode = chantier;
		if (!chantierCode) {
			const chantierRes = await pool
				.request()
				.input("codeMat", sql.VarChar(50), codeMateriel)
				.query(
					"SELECT TOP 1 [code_chantier_m] FROM [Matériel] WHERE [Code_matériel_nouveau] = @codeMat"
				);
			chantierCode = chantierRes.recordset[0]?.code_chantier_m;
			if (!chantierCode) {
				return res
					.status(400)
					.json({ error: "chantier not found for this machine" });
			}
		}

		// ✅ Build Numéro_etat_journée
		const dateStr = new Date(date || new Date())
			.toISOString()
			.slice(0, 10)
			.replace(/-/g, "");
		const numero = `${codeMateriel}/${chantierCode}/${dateStr}`;

		// ✅ Insert
		await pool
			.request()
			.input("numero", sql.VarChar(50), numero)
			.input("date2", sql.DateTime, date ? new Date(date) : new Date())
			.input("codeMat", sql.VarChar(50), codeMateriel)
			.input("chantierCode", sql.VarChar(50), chantierCode)
			.input("etat_j", sql.SmallInt, etat_journ ?? null)
			.input("qcarb", sql.Float, quantite_carburant ?? null)
			.input("qlub", sql.Float, quantite_lubrifiant ?? null)
			.input("hserv", sql.Float, h_service ?? null)
			.input("hpanne", sql.Float, h_panne ?? null)
			.input("hchom", sql.Float, h_chomage ?? null)
			.input("compteur", sql.Int, compteur ?? null).query(`
        INSERT INTO Etat_Journée (
          Numéro_etat_journée,
          Date_2,
          Code_matériel_nouveau,
          Code_Ch11,
          etat_journ,
          Quantité_carburant,
          Quantité_lubrifiant,
          H_Service,
          H_Panne,
          H_Chomage,
          Compteur
        )
        VALUES (
          @numero,
          @date2,
          @codeMat,
          @chantierCode,
          @etat_j,
          @qcarb,
          @qlub,
          @hserv,
          @hpanne,
          @hchom,
          @compteur
        )
      `);

		res.json({
			success: true,
			message: "Inserted new record",
			numero,
		});
	} catch (err) {
		console.error("Insert error", err);
		res.status(500).json({ error: "Insert failed", detail: err.message });
	}
});

// 🟡 PUT: Update Etat_Journée
router.put("/api/etat/:numero", async (req, res) => {
	const { numero } = req.params;
	const {
		etat_journ,
		quantite_carburant,
		quantite_lubrifiant,
		h_service,
		h_panne,
		h_chomage,
		compteur,
	} = req.body;

	try {
		const pool = await getPool();

		// ✅ Build the SET part of the query dynamically
		const setClauses = [];
		const request = pool.request();
		request.input("numero", sql.VarChar(50), numero);

		if (etat_journ !== undefined) {
			setClauses.push("etat_journ = @etat_j");
			request.input("etat_j", sql.SmallInt, etat_journ);
		}
		if (quantite_carburant !== undefined) {
			setClauses.push("Quantité_carburant = @qcarb");
			request.input("qcarb", sql.Float, quantite_carburant);
		}
		if (quantite_lubrifiant !== undefined) {
			setClauses.push("Quantité_lubrifiant = @qlub");
			request.input("qlub", sql.Float, quantite_lubrifiant);
		}
		if (h_service !== undefined) {
			setClauses.push("H_Service = @hserv");
			request.input("hserv", sql.Float, h_service);
		}
		if (h_panne !== undefined) {
			setClauses.push("H_Panne = @hpanne");
			request.input("hpanne", sql.Float, h_panne);
		}
		if (h_chomage !== undefined) {
			setClauses.push("H_Chomage = @hchom");
			request.input("hchom", sql.Float, h_chomage);
		}
		if (compteur !== undefined) {
			setClauses.push("Compteur = @compteur");
			request.input("compteur", sql.Int, compteur);
		}

		if (setClauses.length === 0) {
			return res.status(400).json({ error: "No fields to update" });
		}

		const query = `
			UPDATE Etat_Journée
			SET ${setClauses.join(", ")}
			WHERE Numéro_etat_journée = @numero
		`;

		const result = await request.query(query);

		if (result.rowsAffected[0] === 0) {
			return res.status(404).json({ error: "Record not found" });
		}

		res.json({ success: true, message: "Record updated" });
	} catch (err) {
		console.error("Update error", err);
		res.status(500).json({ error: "Update failed", detail: err.message });
	}
});

// 🟢 GET: Fetch Etat_Journée
router.get("/api/etat", async (req, res) => {
	const { chantier, codeMateriel, date } = req.query;

	try {
		const pool = await getPool();

		let query = `
      SELECT
        [Numéro_etat_journée] AS numero,
        [Date_2] AS date,
        [Code_matériel_nouveau] AS codeMateriel,
        [etat_journ] AS etat,
        [Quantité_carburant] AS carburant,
        [Quantité_lubrifiant] AS lubrifiant,
        [H_Service] AS h_service,
        [H_Panne] AS h_panne,
        [H_Chomage] AS h_chomage,
        [Compteur] AS compteur
      FROM [Etat_Journée]
      WHERE 1=1
    `;

		const request = pool.request();

		if (chantier) {
			query += " AND [Numéro_etat_journée] LIKE @chantierFilter";
			request.input("chantierFilter", sql.VarChar(50), `%/${chantier}/%`);
		}

		if (codeMateriel) {
			query += " AND [Code_matériel_nouveau] = @codeMateriel";
			request.input("codeMateriel", sql.VarChar(50), codeMateriel);
		}

		if (date) {
			query += " AND CONVERT(date, [Date_2]) = CONVERT(date, @date)";
			request.input("date", sql.Date, new Date(date));
		}

		query += " ORDER BY [Date_2] DESC";

		const result = await request.query(query);

		res.json(result.recordset);
	} catch (err) {
		console.error("Fetch error", err);
		res
			.status(500)
			.json({ error: "Failed to fetch data", detail: err.message });
	}
});

// 🟢 GET: List of machines (optional chantier filter)
router.get("/api/machines/:chantier?", async (req, res) => {
	const { chantier } = req.params;

	try {
		const pool = await getPool();

		let query = `
      SELECT
        [Code_matériel_nouveau] AS code,
        [Désignation] AS name,
        [code_chantier_m] AS chantier
      FROM [Matériel]
    `;

		// Optional chantier filter
		if (chantier) {
			query += " WHERE [code_chantier_m] = @chantier";
		}

		query += " ORDER BY [Désignation]";

		const result = await pool
			.request()
			.input("chantier", sql.VarChar(50), chantier || null)
			.query(query);

		res.json(result.recordset);
	} catch (err) {
		console.error("Fetch machines error", err);
		res
			.status(500)
			.json({ error: "Failed to fetch machines", detail: err.message });
	}
});

export default router;
