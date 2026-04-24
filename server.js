const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static(path.join(__dirname, 'public')));

// --- LOGIN ---
app.post('/api/valida-pass', async (req, res) => {
    const { npass } = req.body;
    try {
        const result = await pool.query('SELECT ruolo FROM registro_pass WHERE UPPER(npass) = $1', [npass.toUpperCase()]);
        if (result.rows.length > 0) res.json({ valid: true, ruolo: result.rows[0].ruolo });
        else res.json({ valid: false });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PRENOTAZIONE (INVIO DATI) ---
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni } = req.body;
    try {
        for (let data of giorni) {
            await pool.query('INSERT INTO prenotazioni (npass, data_prenotata, stato) VALUES ($1, $2, $3)', [npass.toUpperCase(), data, 'PRENOTATO']);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MIE PRENOTAZIONI ---
app.get('/api/mie-prenotazioni/:npass', async (req, res) => {
    const r = await pool.query('SELECT data_prenotata, stato FROM prenotazioni WHERE UPPER(npass) = $1 ORDER BY data_prenotata ASC', [req.params.npass.toUpperCase()]);
    res.json(r.rows);
});

// --- LOGICA PIANTONE ---
app.get('/api/piantone/cerca/:npass', async (req, res) => {
    const oggi = new Date().toISOString().split('T')[0];
    const resu = await pool.query('SELECT * FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata = $2', [req.params.npass.toUpperCase(), oggi]);
    res.json(resu.rows.length > 0 ? { trovato: true, prenotazione: resu.rows[0] } : { trovato: false });
});

app.post('/api/piantone/azione', async (req, res) => {
    const { id, azione, npass } = req.body;
    const ora = new Date();
    if (azione === 'E') {
        await pool.query("UPDATE prenotazioni SET stato = 'INGRESSO', orario_ingresso = $1 WHERE id = $2", [ora, id]);
    } else if (azione === 'U') {
        await pool.query("UPDATE prenotazioni SET stato = 'USCITO', orario_uscita = $1 WHERE id = $2", [ora, id]);
        await pool.query("DELETE FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata > CURRENT_DATE", [npass.toUpperCase()]);
    }
    res.json({ success: true });
});

// --- RIEPILOGO GENERALE ---
app.get('/api/riepilogo-totale', async (req, res) => {
    const r = await pool.query(`SELECT npass, data_prenotata, stato, orario_ingresso, orario_uscita FROM prenotazioni ORDER BY data_prenotata DESC`);
    res.json(r.rows);
});

app.listen(process.env.PORT || 3000);