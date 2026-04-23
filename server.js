const nodemailer = require('nodemailer');

// Configurazione Postino (usa la variabile di Render)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'parkingclf.am@gmail.com',
    pass: process.env.EMAIL_PASSWORD 
  }
});

// Modifica la rotta di prenotazione
app.post('/api/prenota', async (req, res) => {
    const { npass, data, utente } = req.body;
    
    try {
        // 1. Salva nel Database
        await pool.query('INSERT INTO prenotazioni (npass, data, utente) VALUES ($1, $2, $3)', [npass, data, utente]);

        // 2. Invia Mail di conferma
        const mailOptions = {
            from: 'parkingclf.am@gmail.com',
            to: utente, // La mail dell'utente
            cc: 'parkingclf.am@gmail.com',
            subject: `Conferma Prenotazione - NPASS: ${npass}`,
            html: `
                <div style="font-family: sans-serif; border: 2px solid #2563eb; padding: 20px; border-radius: 15px;">
                    <h2 style="color: #2563eb;">🅿️ Prenotazione Confermata</h2>
                    <p>Gentile utente <b>${npass}</b>,</p>
                    <p>Abbiamo registrato la tua richiesta per il giorno: <b>${data}</b></p>
                    <p>Riceverai ulteriori comunicazioni in caso di variazioni.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 0.8rem; color: #999;">Sistema Automatico Parcheggi - Logistica</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions); // Invia in background

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore durante la prenotazione" });
    }
});