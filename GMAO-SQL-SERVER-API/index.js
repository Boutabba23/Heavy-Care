import express from "express";
import cors from "cors";
import etatRoute from "./etat-route.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use(etatRoute);

// Test route
app.get("/", (req, res) => {
	res.send("✅ GMAO API is running");
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
	console.log(`🚀 Server running at http://localhost:${PORT}`)
);
