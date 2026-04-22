const express = require('express');
const { Pool } = require('pg'); // Connettore per il database PostgreSQL (Supabase)
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve i tuoi file HTML/CSS dalla cartella 'public'

// Configurazione Database (La stringa la prenderai da Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// API per ricevere la prenotazione
app.post('/api/prenota', async (req, res) => {
    // Riceviamo i tuoi dati: npass (numero posto), nextra (note/targa), data, utente
    const { npass, nextra, data, utente } = req.body;

    try {
        // 1. Controlliamo se il posto è già occupato per quella data
        const queryCheck = 'SELECT * FROM prenotazioni WHERE npass = $1 AND data = $2';
        const check = await pool.query(queryCheck, [npass, data]);

        if (check.rows.length > 0) {
            return res.status(400).json({ error: "Spiacenti, questo posto è già stato prenotato!" });
        }

        // 2. Inseriamo la prenotazione nel database
        const queryInsert = 'INSERT INTO prenotazioni (npass, nextra, data, utente) VALUES ($1, $2, $3, $4)';
        await pool.query(queryInsert, [npass, nextra, data, utente]);

        res.json({ success: true, message: `Prenotazione confermata per il posto ${npass}!` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore nel salvataggio dei dati sul server." });
    }
});

// Avvio del server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server attivo sulla porta ${PORT}`);
});