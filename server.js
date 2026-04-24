const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Configurazione Database per Nord Europa (Stockholm)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Verifica connessione all'avvio
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ ERRORE CONNESSIONE DB:', err.message);
  } else {
    console.log('✅ DATABASE CONNESSO IN NORD EUROPA!');
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { 
    user: 'parkingclf.am@gmail.com', 
    pass: process.env.EMAIL_PASSWORD 
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// --- VALIDAZIONE PASS ---
app.post('/api/valida-pass', async (req, res) => {
    const { npass } = req.body;
    try {
        const result = await pool.query('SELECT ruolo FROM registro_pass WHERE UPPER(npass) = $1', [npass.toUpperCase()]);
        if (result.rows.length > 0) {
            await pool.query('UPDATE registro_pass SET ultimo_accesso = NOW() WHERE UPPER(npass) = $1', [npass.toUpperCase()]);
            res.json({ valid: true, ruolo: result.rows[0].ruolo });
        } else {
            res.json({ valid: false, message: "Pass non trovato." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRENOTAZIONE CON RIEPILOGO GIORNI ---
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, utente } = req.body;
    try {
        // 1. Salva ogni giorno nel database
        for (let data of giorni) {
            await pool.query('INSERT INTO prenotazioni (npass, data_prenotata) VALUES ($1, $2)', [npass.toUpperCase(), data]);
        }
        
        // 2. Aggiorna il periodo nell'anagrafica
        const periodo = `dal ${new Date(giorni[0]).toLocaleDateString('it-IT')} al ${new Date(giorni[giorni.length-1]).toLocaleDateString('it-IT')}`;
        await pool.query('UPDATE registro_pass SET ult_pren = $1 WHERE UPPER(npass) = $2', [periodo, npass.toUpperCase()]);

        // 3. Preparazione dati per la mail (Grafica SCRNS. 3 + Chicca Conteggio)
        const conteggioGiorni = giorni.length;
        const listaGiorniFormattati = giorni.map(d => new Date(d).toLocaleDateString('it-IT')).join(', ');

        const mailOptions = {
            from: 'parkingclf.am@gmail.com',
            to: utente,
            cc: 'parkingclf.am@gmail.com',
            subject: `Conferma Prenotazione C.L. Fontanarossa - ${npass.toUpperCase()}`,
            html: `
            <div style="font-family: sans-serif; border: 2px solid #3b82f6; border-radius: 20px; padding: 25px; max-width: 600px; color: #333;">
                <h2 style="color: #3b82f6; margin-top: 0;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                <p>Gentile utente <b>${npass.toUpperCase()}</b>, la tua prenotazione è confermata.</p>
                <p><b>Periodo:</b> ${periodo}</p>
                <p><b>Giorni:</b> ${conteggioGiorni} (${listaGiorniFormattati})</p>
                <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 14px; color: #666;">Sistema di prenotazione Parcheggio C.L. Fontanarossa</p>
            </div>
            `
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
        const result = await pool.query(`
            SELECT data_prenotata as data, COUNT(*) as occupati, (120 - COUNT(*)) as liberi 
            FROM prenotazioni 
            WHERE data_prenotata >= CURRENT_DATE 
            GROUP BY data_prenotata ORDER BY data_prenotata ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Errore stats" });
    }
});
// --- RECUPERA PRENOTAZIONI UTENTE ---
app.get('/api/mie-prenotazioni/:npass', async (req, res) => {
    try {
        const { npass } = req.params;
        const result = await pool.query(
            'SELECT id, data_prenotata FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE ORDER BY data_prenotata ASC',
            [npass.toUpperCase()]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Errore recupero prenotazioni" });
    }
});

// --- ELIMINA TUTTE LE PRENOTAZIONI UTENTE (FUTURE) ---
app.delete('/api/elimina-prenotazioni/:npass', async (req, res) => {
    try {
        const { npass } = req.params;
        await pool.query(
            'DELETE FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE',
            [npass.toUpperCase()]
        );
        // Puliamo anche il campo ult_pren nel registro
        await pool.query('UPDATE registro_pass SET ult_pren = NULL WHERE UPPER(npass) = $1', [npass.toUpperCase()]);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Errore eliminazione" });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));