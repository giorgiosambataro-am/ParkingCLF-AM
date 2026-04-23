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

// --- VALIDAZIONE PASS ---
app.post('/api/valida-pass', async (req, res) => {
    const { npass } = req.body;
    console.log("Tentativo accesso per:", npass);
    try {
        const result = await pool.query('SELECT ruolo FROM registro_pass WHERE UPPER(npass) = $1', [npass.toUpperCase()]);
        if (result.rows.length > 0) {
            await pool.query('UPDATE registro_pass SET ultimo_accesso = NOW() WHERE UPPER(npass) = $1', [npass.toUpperCase()]);
            res.json({ valid: true, ruolo: result.rows[0].ruolo });
        } else {
            res.json({ valid: false, message: "Pass non trovato nel database." });
        }
    } catch (err) {
        console.error("Errore Database:", err.message);
        res.status(500).json({ error: "Errore interno del server" });
    }
});

// --- PRENOTAZIONE ---
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, utente } = req.body;
    try {
        for (let data of giorni) {
            await pool.query('INSERT INTO prenotazioni (npass, data_prenotata) VALUES ($1, $2)', [npass.toUpperCase(), data]);
        }
        
        const periodo = `dal ${new Date(giorni[0]).toLocaleDateString('it-IT')} al ${new Date(giorni[giorni.length-1]).toLocaleDateString('it-IT')}`;
        await pool.query('UPDATE registro_pass SET ult_pren = $1 WHERE UPPER(npass) = $2', [periodo, npass.toUpperCase()]);

        const mailOptions = {
            from: 'parkingclf.am@gmail.com',
            to: utente,
            cc: 'parkingclf.am@gmail.com',
            subject: `Conferma Parcheggio C.L. Fontanarossa - ${npass}`,
            html: `<h3>Prenotazione Confermata</h3><p>Gentile utente ${npass}, il periodo prenotato è: <b>${periodo}</b>.</p>`
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) {
        console.error("Errore Salvataggio:", err.message);
        res.status(500).json({ error: "Errore durante la prenotazione" });
    }
});

// --- STATISTICHE ADMIN ---
app.get('/api/admin-stats', async (req, res) => {
    try {
        const query = `
            SELECT data_prenotata as data, COUNT(*) as occupati, (120 - COUNT(*)) as liberi 
            FROM prenotazioni 
            WHERE data_prenotata >= CURRENT_DATE 
            GROUP BY data_prenotata ORDER BY data_prenotata ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Errore caricamento statistiche" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));