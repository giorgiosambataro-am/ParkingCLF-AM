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

// Questo log è fondamentale: leggilo nella dashboard di Render!
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ ERRORE CONNESSIONE:', err.message);
  } else {
    console.log('✅ DATABASE AGGANCIATO!');
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

app.post('/api/valida-pass', async (req, res) => {
    const { npass } = req.body;
    console.log("Controllo NPASS richiesto:", npass); // Log per debug
    
    try {
        // Cerchiamo nel nuovo registro_pass
        const query = 'SELECT ruolo FROM registro_pass WHERE UPPER(npass) = $1';
        const result = await pool.query(query, [npass.toUpperCase().trim()]);
        
        if (result.rows.length > 0) {
            console.log("✅ PASS TROVATO! Ruolo:", result.rows[0].ruolo);
            
            // Aggiorniamo l'accesso (opzionale, se fallisce non blocca il login)
            pool.query('UPDATE registro_pass SET ultimo_accesso = NOW() WHERE UPPER(npass) = $1', [npass.toUpperCase()]).catch(e => console.log("Errore update log:", e.message));

            res.json({ valid: true, ruolo: result.rows[0].ruolo });
        } else {
            console.log("❌ PASS NON TROVATO nel database registro_pass");
            res.json({ valid: false, message: "NPASS non autorizzato o errato." });
        }
    } catch (err) {
        console.error("🔥 ERRORE QUERY:", err.message);
        res.status(500).json({ error: "Errore database", details: err.message });
    }
});


app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, utente } = req.body;
    try {
        for (let data of giorni) {
            await pool.query(
                'INSERT INTO prenotazioni (npass, data_prenotata) VALUES ($1, $2)', 
                [npass.toUpperCase(), data]
            );
        }
        
        const periodo = `dal ${new Date(giorni[0]).toLocaleDateString('it-IT')} al ${new Date(giorni[giorni.length-1]).toLocaleDateString('it-IT')}`;
        await pool.query(
            'UPDATE registro_pass SET ult_pren = $1 WHERE UPPER(npass) = $2', 
            [periodo, npass.toUpperCase()]
        );

        const mailOptions = {
            from: 'parkingclf.am@gmail.com',
            to: utente,
            cc: 'parkingclf.am@gmail.com',
            subject: `Conferma Parcheggio C.L. Fontanarossa - ${npass}`,
            html: `<h3>Prenotazione Confermata</h3><p>Periodo: <b>${periodo}</b></p>`
        };
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) {
        console.error("Errore prenotazione:", err.message);
        res.status(500).json({ error: "Errore salvataggio" });
    }
});

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
        res.status(500).json({ error: "Errore statistiche" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server attivo sulla porta ${PORT}`));
