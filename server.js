const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configurazione Database (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 2. Configurazione Postino (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'parkingclf.am@gmail.com',
    pass: process.env.EMAIL_PASSWORD 
  }
});

// 3. Servire i file statici (la tua grafica)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Rotta per le Prenotazioni + Invio Mail
app.post('/api/prenota', async (req, res) => {
    const { npass, data, utente } = req.body;
    
    try {
        // Salva nel Database
        const queryInsert = 'INSERT INTO prenotazioni (npass, data, utente) VALUES ($1, $2, $3)';
        await pool.query(queryInsert, [npass, data, utente]);

        // Invia Mail di conferma
        const mailOptions = {
            from: 'parkingclf.am@gmail.com',
            to: utente, 
            cc: 'parkingclf.am@gmail.com',
            subject: `Conferma Prenotazione - NPASS: ${npass}`,
            html: `
                <div style="font-family: sans-serif; border: 2px solid #2563eb; padding: 20px; border-radius: 15px;">
                    <h2 style="color: #2563eb;">🅿️ Prenotazione Confermata</h2>
                    <p>Gentile utente <b>${npass}</b>,</p>
                    <p>Abbiamo registrato la tua richiesta per il giorno: <b>${data}</b></p>
                    <p>Questa è una conferma automatica della tua prenotazione.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 0.8rem; color: #999;">Sistema Automatico Parcheggi - Logistica</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.log("Errore invio mail:", error);
            else console.log("Mail inviata correttamente a: " + utente);
        });

        res.json({ success: true, message: "Prenotazione salvata e mail inviata!" });
    } catch (err) {
        console.error("Errore Database:", err);
        res.status(500).json({ error: "Errore durante la prenotazione" });
    }
});

// 5. Avvio Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server acceso sulla porta ${PORT}`);
});