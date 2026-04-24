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

// PRENOTAZIONE + EMAIL
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, email } = req.body;
    try {
        const sorted = giorni.sort();
        for (let d of sorted) {
            await pool.query('INSERT INTO prenotazioni (npass, data_prenotata, stato) VALUES ($1, $2, $3)', [npass.toUpperCase(), d, 'PRENOTATO']);
        }
        const mailOptions = {
            from: '"Parcheggio C.L. Fontanarossa" <parkingclf.am@gmail.com>',
            to: email,
            subject: `Conferma - ${npass.toUpperCase()}`,
            html: `<div style="font-family:sans-serif;border:2px solid #3b82f6;border-radius:15px;padding:20px;max-width:600px;">
                <h2 style="color:#3b82f6;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                <p>Gentile utente <b>${npass.toUpperCase()}</b>, la tua prenotazione è confermata.</p>
                <p><b>Periodo:</b> dal ${new Date(sorted[0]).toLocaleDateString('it-IT')} al ${new Date(sorted[sorted.length-1]).toLocaleDateString('it-IT')}</p>
                <p><b>Giorni:</b> ${sorted.map(d => new Date(d).toLocaleDateString('it-IT')).join(', ')}</p>
            </div>`
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CRUSCOTTO AMMINISTRATORE (Capacità 120)
app.get('/api/admin/cruscotto', async (req, res) => {
    const r = await pool.query(`
        SELECT data_prenotata, COUNT(*) as occupati 
        FROM prenotazioni 
        WHERE data_prenotata >= CURRENT_DATE 
        GROUP BY data_prenotata 
        ORDER BY data_prenotata ASC LIMIT 7
    `);
    const dashboard = r.rows.map(row => ({
        data: new Date(row.data_prenotata).toLocaleDateString('it-IT'),
        occupati: row.occupati,
        liberi: 120 - row.occupati
    }));
    res.json(dashboard);
});

// UTENTE: LISTA E CANCELLAZIONE
app.get('/api/mie-prenotazioni/:npass', async (req, res) => {
    const r = await pool.query('SELECT data_prenotata, stato FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE ORDER BY data_prenotata ASC', [req.params.npass.toUpperCase()]);
    res.json(r.rows);
});

app.post('/api/elimina-tutte', async (req, res) => {
    await pool.query('DELETE FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE', [req.body.npass.toUpperCase()]);
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000);