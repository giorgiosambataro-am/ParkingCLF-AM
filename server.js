const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configurazione Database (Connessione Diretta)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000, // aspetta max 5 secondi
  idleTimeoutMillis: 10000,       // chiudi connessioni inattive dopo 10s
});

// Test di connessione immediato all'avvio
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ ERRORE CRITICO CONNESSIONE DB:', err.message);
  } else {
    console.log('✅ DATABASE CONNESSO CORRETTAMENTE');
  }
});

// 2. Configurazione Postino (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'parkingclf.am@gmail.com',
    pass: process.env.EMAIL_PASSWORD 
  }
});

// 3. File Statici
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Rotta Prenotazioni (Mail Singola Riepilogativa)
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, utente } = req.body;
    
    // Prova il salvataggio, ma non bloccare tutto se fallisce
    try {
        for (let data of giorni) {
            await pool.query('INSERT INTO prenotazioni (npass, data, utente) VALUES ($1, $2, $3)', [npass, data, utente]);
        }
        console.log("Dati salvati su Supabase");
    } catch (err) {
        console.error("Database non raggiungibile, procedo solo con invio mail:", err.message);
    }

    // Costruzione Mail
    const dataInizio = new Date(giorni[0]).toLocaleDateString('it-IT');
    const dataFine = new Date(giorni[giorni.length - 1]).toLocaleDateString('it-IT');
    const listaGiorni = giorni.map(d => new Date(d).toLocaleDateString('it-IT')).join(', ');

    const mailOptions = {
        from: 'parkingclf.am@gmail.com',
        to: utente,
        cc: 'parkingclf.am@gmail.com',
        subject: `Conferma Prenotazione C.L. Fontanarossa - ${npass}`,
        html: `
            <div style="font-family: sans-serif; border: 2px solid #2563eb; padding: 20px; border-radius: 15px;">
                <h2 style="color: #2563eb;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                <p>Gentile utente <b>${npass}</b>, la tua prenotazione è confermata.</p>
                <p><b>Periodo:</b> dal ${dataInizio} al ${dataFine}</p>
                <p><b>Giorni:</b> ${listaGiorni}</p>
                <hr>
                <p style="font-size: 0.8rem;">Sistema di prenotazione Parcheggio C.L. Fontanarossa</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) console.log("Errore invio mail:", error);
        // Rispondi sempre OK al cliente così vede il messaggio di successo
        res.json({ success: true });
    });
});

// 5. Avvio Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server acceso sulla porta ${PORT}`);
});