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

// PRENOTAZIONE (Salva come unico record con Inizio e Fine)
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, email } = req.body;
    try {
        const sorted = giorni.sort();
        const dataInizio = sorted[0];
        const dataFine = sorted[sorted.length - 1];

        // Inserisce un UNICO record per tutta la prenotazione
        await pool.query(
            'INSERT INTO prenotazioni (npass, data_inizio, data_fine, stato) VALUES ($1, $2, $3, $4)', 
            [npass.toUpperCase(), dataInizio, dataFine, 'PRENOTATO']
        );
        
        const mailOptions = {
            from: '"Parcheggio C.L. Fontanarossa" <parkingclf.am@gmail.com>',
            to: [email, 'parkingclf.am@gmail.com'],
            subject: `Conferma Prenotazione - ${npass.toUpperCase()}`,
            html: `
                <div style="font-family:sans-serif; border:2px solid #3b82f6; border-radius:15px; padding:20px; max-width:600px;">
                    <h2 style="color:#3b82f6;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                    <p>Conferma per il PASS: <b>${npass.toUpperCase()}</b></p>
                    <p><b>Periodo Prenotato:</b> dal ${new Date(dataInizio).toLocaleDateString('it-IT')} al ${new Date(dataFine).toLocaleDateString('it-IT')}</p>
                </div>`
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// LISTA MIE PRENOTAZIONI
app.get('/api/mie-prenotazioni/:npass', async (req, res) => {
    const r = await pool.query('SELECT data_inizio, data_fine, stato FROM prenotazioni WHERE UPPER(npass) = $1 AND data_fine >= CURRENT_DATE ORDER BY data_inizio ASC', [req.params.npass.toUpperCase()]);
    res.json(r.rows);
});

// PIANTONE: CERCA IL RECORD UNICO
app.get('/api/piantone/cerca/:npass', async (req, res) => {
    const r = await pool.query(
        'SELECT * FROM prenotazioni WHERE UPPER(npass) = $1 AND data_fine >= CURRENT_DATE ORDER BY data_inizio ASC LIMIT 1', 
        [req.params.npass.toUpperCase()]
    );
    res.json(r.rows.length > 0 ? { trovato: true, prenotazione: r.rows[0] } : { trovato: false });
});

app.post('/api/piantone/azione', async (req, res) => {
    const { id, azione } = req.body;
    const ora = new Date();
    await pool.query(`UPDATE prenotazioni SET stato = $1, ${azione === 'E' ? 'orario_ingresso' : 'orario_uscita'} = $2 WHERE id = $3`, [azione === 'E' ? 'INGRESSO' : 'USCITO', ora, id]);
    res.json({ success: true });
});

// ADMIN: Calcola occupazione verificando se il giorno è compreso tra Inizio e Fine
app.get('/api/admin/cruscotto', async (req, res) => {
    try {
        // Query che genera i prossimi 15 giorni e conta quante prenotazioni li coprono
        const query = `
            WITH giorni AS (
                SELECT generate_series(CURRENT_DATE, CURRENT_DATE + interval '14 days', '1 day')::date AS d
            )
            SELECT g.d AS data, COUNT(p.id) AS occupati
            FROM giorni g
            LEFT JOIN prenotazioni p ON g.d BETWEEN p.data_inizio AND p.data_fine
            GROUP BY g.d ORDER BY g.d;
        `;
        const r = await pool.query(query);
        res.json(r.rows.map(row => ({
            data: new Date(row.data).toLocaleDateString('it-IT'),
            occupati: parseInt(row.occupati),
            liberi: 120 - parseInt(row.occupati)
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/veicoli-dentro', async (req, res) => {
    const r = await pool.query("SELECT npass, data_fine, orario_ingresso FROM prenotazioni WHERE stato = 'INGRESSO'");
    res.json(r.rows);
});

app.listen(process.env.PORT || 3000);