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
        
        const mailOptions = {
            from: 'parkingclf.am@gmail.com',
            to: utente,
            subject: `Conferma Prenotazione - ${npass.toUpperCase()}`,
            html: `<div style="border: 2px solid #3b82f6; border-radius: 20px; padding: 20px; font-family: sans-serif;">
                <h2 style="color: #3b82f6;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                <p>Gentile <b>${npass.toUpperCase()}</b>, prenotazione confermata.</p>
                <p><b>Periodo:</b> dal ${new Date(giorni[0]).toLocaleDateString('it-IT')} al ${new Date(giorni[giorni.length-1]).toLocaleDateString('it-IT')}</p>
            </div>`
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
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

app.get('/api/piantone/monitoraggio', async (req, res) => {
    const query = `SELECT p.npass, p.data_prenotata, p.stato, p.orario_ingresso FROM prenotazioni p WHERE p.stato = 'INGRESSO'`;
    const result = await pool.query(query);
    const oggi = new Date(); oggi.setHours(0,0,0,0);
    const monitor = result.rows.map(a => {
        const dScad = new Date(a.data_prenotata);
        let c = '#22c55e', e = 'In Regola';
        if (dScad.getTime() === oggi.getTime()) { c = '#f59e0b'; e = 'In Scadenza'; }
        else if (dScad < oggi) { c = '#ef4444'; e = 'SCADUTO'; }
        const hI = a.orario_ingresso ? new Date(a.orario_ingresso).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}) : '--:--';
        return { npass: a.npass, scad: dScad.toLocaleDateString('it-IT'), mov: `INGRESSO (${new Date().toLocaleDateString('it-IT')}) ${hI}`, col: c, et: e };
    });
    res.json(monitor);
});

// --- ADMIN & USER ---
app.get('/api/mie-prenotazioni/:npass', async (req, res) => {
    const r = await pool.query('SELECT data_prenotata FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE ORDER BY data_prenotata ASC', [req.params.npass.toUpperCase()]);
    res.json(r.rows);
});

app.get('/api/admin-stats', async (req, res) => {
    const r = await pool.query('SELECT data_prenotata as data, COUNT(DISTINCT npass) as occupati, (120 - COUNT(DISTINCT npass)) as liberi FROM prenotazioni WHERE data_prenotata >= CURRENT_DATE GROUP BY data_prenotata ORDER BY data_prenotata ASC');
    res.json(r.rows);
});

app.listen(process.env.PORT || 3000, () => console.log("Server avviato"));