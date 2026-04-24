const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer'); // <--- QUESTA MANCAVA!

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CONFIGURAZIONE EMAIL
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'parkingclf.am@gmail.com',
    pass: process.env.EMAIL_PASSWORD 
  }
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

// --- PRENOTAZIONE + INVIO MAIL ---
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, email } = req.body;
    try {
        const sortedDays = giorni.sort();
        for (let data of sortedDays) {
            await pool.query('INSERT INTO prenotazioni (npass, data_prenotata, stato) VALUES ($1, $2, $3)', [npass.toUpperCase(), data, 'PRENOTATO']);
        }

        const mailOptions = {
            from: '"Parcheggio C.L. Fontanarossa" <parkingclf.am@gmail.com>',
            to: email,
            subject: `Conferma Prenotazione - ${npass.toUpperCase()}`,
            html: `
            <div style="font-family: sans-serif; border: 2px solid #3b82f6; border-radius: 15px; padding: 20px; max-width: 600px;">
                <h2 style="color: #3b82f6;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                <p>Gentile utente <b>${npass.toUpperCase()}</b>, la tua prenotazione è confermata.</p>
                <p><b>Periodo:</b> dal ${new Date(sortedDays[0]).toLocaleDateString('it-IT')} al ${new Date(sortedDays[sortedDays.length-1]).toLocaleDateString('it-IT')}</p>
                <p><b>Giorni totali:</b> ${sortedDays.length}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">Questo è un messaggio automatico, non rispondere.</p>
            </div>`
        };
        
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MIE PRENOTAZIONI ---
app.get('/api/mie-prenotazioni/:npass', async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT data_prenotata, stato FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE ORDER BY data_prenotata ASC', 
            [req.params.npass.toUpperCase()]
        );
        res.json(r.rows);
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

app.get('/api/riepilogo-totale', async (req, res) => {
    const r = await pool.query(`SELECT npass, data_prenotata, stato, orario_ingresso, orario_uscita FROM prenotazioni ORDER BY data_prenotata DESC`);
    res.json(r.rows);
});

app.listen(process.env.PORT || 3000, () => console.log("Server online"));