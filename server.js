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

// LOGIN
app.post('/api/valida-pass', async (req, res) => {
    const { npass } = req.body;
    try {
        const result = await pool.query('SELECT ruolo FROM registro_pass WHERE UPPER(npass) = $1', [npass.toUpperCase()]);
        if (result.rows.length > 0) res.json({ valid: true, ruolo: result.rows[0].ruolo });
        else res.json({ valid: false });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PRENOTAZIONE CON DOPPIO INVIO MAIL (IMG 5)
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, email } = req.body;
    try {
        const sorted = giorni.sort();
        for (let d of sorted) {
            await pool.query('INSERT INTO prenotazioni (npass, data_prenotata, stato) VALUES ($1, $2, $3)', [npass.toUpperCase(), d, 'PRENOTATO']);
        }
        
        const mailOptions = {
            from: '"Parcheggio C.L. Fontanarossa" <parkingclf.am@gmail.com>',
            to: [email, 'parkingclf.am@gmail.com'], // Invia a utente e al parcheggio
            subject: `Conferma Prenotazione - ${npass.toUpperCase()}`,
            html: `
                <div style="font-family:sans-serif; border:2px solid #3b82f6; border-radius:15px; padding:20px; max-width:600px;">
                    <h2 style="color:#3b82f6;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                    <p>Conferma prenotazione per il PASS: <b>${npass.toUpperCase()}</b></p>
                    <p><b>Giorni prenotati:</b> ${sorted.map(d => new Date(d).toLocaleDateString('it-IT')).join(', ')}</p>
                    <p><b>Periodo:</b> dal ${new Date(sorted[0]).toLocaleDateString('it-IT')} al ${new Date(sorted[sorted.length-1]).toLocaleDateString('it-IT')}</p>
                </div>`
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// LISTA UTENTE
app.get('/api/mie-prenotazioni/:npass', async (req, res) => {
    const r = await pool.query('SELECT data_prenotata, stato FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE ORDER BY data_prenotata ASC', [req.params.npass.toUpperCase()]);
    res.json(r.rows);
});

// PIANTONE: RICERCA E AZIONE (IMG 4)
app.get('/api/piantone/cerca/:npass', async (req, res) => {
    const r = await pool.query('SELECT * FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE ORDER BY data_prenotata ASC', [req.params.npass.toUpperCase()]);
    res.json(r.rows.length > 0 ? { trovato: true, prenotazioni: r.rows } : { trovato: false });
});

app.post('/api/piantone/azione', async (req, res) => {
    const { id, azione } = req.body;
    const ora = new Date();
    const stato = azione === 'E' ? 'INGRESSO' : 'USCITO';
    await pool.query(`UPDATE prenotazioni SET stato = $1, ${azione === 'E' ? 'orario_ingresso' : 'orario_uscita'} = $2 WHERE id = $3`, [stato, ora, id]);
    res.json({ success: true });
});

// ADMIN: CRUSCOTTO
app.get('/api/admin/cruscotto', async (req, res) => {
    const r = await pool.query('SELECT data_prenotata, COUNT(*) as occupati FROM prenotazioni WHERE data_prenotata >= CURRENT_DATE GROUP BY data_prenotata ORDER BY data_prenotata ASC');
    res.json(r.rows.map(row => ({
        data: new Date(row.data_prenotata).toLocaleDateString('it-IT'),
        occupati: row.occupati,
        liberi: 120 - row.occupati
    })));
});

app.get('/api/veicoli-dentro', async (req, res) => {
    const r = await pool.query("SELECT npass, data_prenotata, orario_ingresso FROM prenotazioni WHERE stato = 'INGRESSO' ORDER BY orario_ingresso DESC");
    res.json(r.rows);
});

app.listen(process.env.PORT || 3000);