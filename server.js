const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configurazione Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. Istruzione per leggere i file grafici
// Assicurati che la cartella si chiami 'public' su GitHub!
app.use(express.static(path.join(__dirname, 'public')));

// 3. Istruzione specifica per l'indirizzo principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. La tua API per le prenotazioni
app.post('/api/prenota', async (req, res) => {
    const { npass, nextra, data, utente } = req.body;
    try {
        const queryInsert = 'INSERT INTO prenotazioni (npass, nextra, data, utente) VALUES ($1, $2, $3, $4)';
        await pool.query(queryInsert, [npass, nextra, data, utente]);
        res.json({ success: true, message: "Prenotazione salvata!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore database" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server acceso sulla porta ${PORT}`);
});
