// ... (resto delle importazioni e pool invariati)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'parkingclf.am@gmail.com', pass: process.env.EMAIL_PASSWORD }
});

// --- PRENOTAZIONE CON MAIL GRAFICA ---
app.post('/api/prenota', async (req, res) => {
    const { npass, giorni, email } = req.body;
    try {
        const sortedDays = giorni.sort();
        for (let data of sortedDays) {
            await pool.query('INSERT INTO prenotazioni (npass, data_prenotata, stato) VALUES ($1, $2, $3)', [npass.toUpperCase(), data, 'PRENOTATO']);
        }

        const mailOptions = {
            from: '"Parcheggio C.L. Fontanarossa" <parkingclf.am@gmail.com>',
            to: email,
            subject: `Conferma Prenotazione - ${npass.toUpperCase()}`,
            html: `
            <div style="font-family: sans-serif; border: 1px solid #3b82f6; border-radius: 15px; padding: 20px; max-width: 600px;">
                <h2 style="color: #3b82f6;">🅿️ Parcheggio C.L. Fontanarossa</h2>
                <p>Gentile utente <b>${npass.toUpperCase()}</b>, la tua prenotazione è confermata.</p>
                <p><b>Periodo:</b> dal ${new Date(sortedDays[0]).toLocaleDateString('it-IT')} al ${new Date(sortedDays[sortedDays.length-1]).toLocaleDateString('it-IT')}</p>
                <p><b>Giorni:</b> ${sortedDays.map(d => new Date(d).toLocaleDateString('it-IT')).join(', ')}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">Sistema di prenotazione Parcheggio C.L. Fontanarossa</p>
            </div>`
        };
        
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- RECUPERO MIE PRENOTAZIONI ---
app.get('/api/mie-prenotazioni/:npass', async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT data_prenotata, stato FROM prenotazioni WHERE UPPER(npass) = $1 AND data_prenotata >= CURRENT_DATE ORDER BY data_prenotata ASC', 
            [req.params.npass.toUpperCase()]
        );
        res.json(r.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});