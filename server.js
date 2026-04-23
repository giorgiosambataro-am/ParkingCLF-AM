app.post('/api/prenota', async (req, res) => {
    const { npass, data, utente } = req.body;
    
    // 1. Proviamo a salvare nel Database
    try {
        const queryInsert = 'INSERT INTO prenotazioni (npass, data, utente) VALUES ($1, $2, $3)';
        await pool.query(queryInsert, [npass, data, utente]);
        console.log("Salvataggio DB riuscito");
    } catch (err) {
        console.error("Errore Database (ma procedo con la mail):", err.message);
        // NON blocchiamo l'esecuzione qui, così la mail parte comunque
    }

    // 2. Prepariamo e inviamo la Mail
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
                <hr style="border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 0.8rem; color: #999;">Sistema Logistica</p>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Errore mail:", error);
            return res.status(500).json({ error: "Errore invio mail" });
        }
        console.log("Mail inviata!");
        res.json({ success: true, message: "Operazione completata" });
    });
});