const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'parkingclf.am@gmail.com', pass: process.env.EMAIL_PASSWORD }
});

app.use(express.static(path.join(__dirname, 'public')));

// --- LOGIN ---
app.post('/api/valida-pass', async (req, res) => {
    const { npass } = req.body;
    try {
        const result = await pool.query('SELECT ruolo FROM registro_pass WHERE UPPER(npass) = $1', [npass.toUpperCase()]);
        if (result.rows.length > 0) {
            res.json({ valid: true, ruolo: result.rows[0].ruolo });
        } else {
            res.json({ valid: false, message: "Pass non trovato." });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PRENOTAZIONE ---
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, utente } = req.body;
    try {
        const check = await pool.query('SELECT data_prenotata FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata = ANY($2)', [npass.toUpperCase(), giorni]);
        if (check.rows.length > 0) return res.status(409).json({ error: "Date già prenotate." });

        for (let data of giorni) {
            await pool.query('INSERT INTO prenotazioni (npass, data_prenotata, stato) VALUES ($1, $2, $3)', [npass.toUpperCase(), data, 'PRENOTATO']);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LOGICA PIANTONE ---
app.get('/api/piantone/cerca/:npass', async (req, res) => {
    const oggi = new Date().toISOString().split('T')[0];
    const resu = await pool.query(
        'SELECT * FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata = $2', 
        [req.params.npass.toUpperCase(), oggi]
    );
    res.json(resu.rows.length > 0 ? { trovato: true, prenotazione: resu.rows[0] } : { trovato: false });
});

app.post('/api/piantone/azione', async (req, res) => {
    const { id, azione, npass } = req.body;
    const oraAttuale = new Date();
    
    if (azione === 'E') {
        await pool.query("UPDATE prenotazioni SET stato = 'INGRESSO', orario_ingresso = $1 WHERE id = $2", [oraAttuale, id]);
    } else if (azione === 'U') {
        await pool.query("UPDATE prenotazioni SET stato = 'USCITO', orario_uscita = $1 WHERE id = $2", [oraAttuale, id]);
        await pool.query("DELETE FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata > CURRENT_DATE", [npass.toUpperCase()]);
    }
    res.json({ success: true });
});

app.get('/api/piantone/monitoraggio', async (req, res) => {
    const query = `
        SELECT p.npass, MAX(p.data_prenotata) as data_fine, p.stato, p.orario_ingresso, p.orario_uscita
        FROM prenotazioni p 
        WHERE p.npass IN (SELECT npass FROM prenotazioni WHERE stato = 'INGRESSO') 
        GROUP BY p.npass, p.stato, p.orario_ingresso, p.orario_uscita`;
    const result = await pool.query(query);
    const oggi = new Date(); oggi.setHours(0,0,0,0);

    const data = result.rows.map(a => {
        const df = new Date(a.data_fine);
        let c = 'green', e = 'In Regola';
        const hIngresso = a.orario_ingresso ? new Date(a.orario_ingresso).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'}) : '--:--';
        
        if (df.getTime() === oggi.getTime()) { c = 'orange'; e = 'In Scadenza'; }
        else if (df < oggi) { c = 'red'; e = 'SCADUTO'; }
        
        return { 
            npass: a.npass, 
            fine: df.toLocaleDateString('it-IT'), 
            colore: c, 
            etichetta: e,
            info: `INGRESSO (${new Date().toLocaleDateString('it-IT')}) ${hIngresso}` 
        };
    });
    res.json(data);
});

// --- UTILS ADMIN & USER ---
app.get('/api/admin-stats', async (req, res) => {
    const r = await pool.query('SELECT data_prenotata as data, COUNT(DISTINCT npass) as occupati, (120 - COUNT(DISTINCT npass)) as liberi FROM prenotazioni WHERE data_prenotata >= CURRENT_DATE GROUP BY data_prenotata ORDER BY data_prenotata ASC');
    res.json(r.rows);
});

app.listen(process.env.PORT || 3000, () => console.log("Server attivo"));