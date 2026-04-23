const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');

// QUESTA RIGA È FONDAMENTALE: crea l'oggetto app
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

// 3. File Statici
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Rotta Prenotazioni
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, utente } = req.body; // Riceve 'giorni' come array
    
    try {
        // 1. Salvataggio multiplo nel Database
        for (let data della lista giorni) {
            await pool.query('INSERT INTO prenotazioni (npass, data, utente) VALUES ($1, $2, $3)', [npass, data, utente]);
        }

        // 2. Prepariamo i dati per la mail singola
        const dataInizio = new Date(giorni[0]).toLocaleDateString('it-IT');
        const dataFine = new Date(giorni[giorni.length - 1]).toLocaleDateString('it-IT');
        const listaGiorniTesto = giorni.map(d => new Date(d).toLocaleDateString('it-IT')).join(', ');

        const mailOptions = {
            from: 'parkingclf.am@gmail.com',
            to: utente, 
            cc: 'parkingclf.am@gmail.com',
            subject: `Conferma Prenotazione C.L. Fontanarossa - NPASS: ${npass}`,
            html: `
                <div style="font-family: sans-serif; border: 2px solid #2563eb; padding: 20px; border-radius: 15px; max-width: 600px;">
                    <h2 style="color: #2563eb; text-align: center;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                    <p>Gentile utente <b>${npass}</b>,</p>
                    <p>Abbiamo registrato correttamente la tua prenotazione.</p>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 10px;">
                        <strong>Periodo:</strong> dal ${dataInizio} al ${dataFine}<br>
                        <strong>Giorni selezionati:</strong> ${listaGiorniTesto}
                    </div>
                    <p>Ti ricordiamo di esporre il pass all'ingresso.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 0.8rem; color: #999; text-align: center;">Sistema di prenotazione Parcheggio C.L. Fontanarossa</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore durante la procedura" });
    }
});

// 5. Avvio
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server acceso sulla porta ${PORT}`);
});