let npassCorrente = "";
let giorniSelezionati = [];

async function verificaAccesso() {
    const npassInput = document.getElementById('npass').value.trim();
    if (!npassInput) return alert("Inserisci un NPASS");

    try {
        const response = await fetch('/api/valida-pass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npass: npassInput })
        });

        // Se il server risponde male (es. errore 500)
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Errore server:", errorText);
            return alert("Errore del server: " + response.status);
        }

        const data = await response.json();

        if (data.valid) {
            npassCorrente = npassInput.toUpperCase();
            document.getElementById('login-section').style.display = 'none';
            
            if (data.ruolo === 'admin') {
                mostraAdminDashboard();
            } else {
                document.getElementById('calendar-section').style.display = 'block';
                if (typeof generaCalendario === "function") generaCalendario();
            }
        } else {
            alert(data.message || "Accesso negato");
        }
    } catch (error) {
        console.error("Errore connessione:", error);
        alert("Errore di connessione: il server non risponde.");
    }
}

async function mostraAdminDashboard() {
    document.getElementById('admin-section').style.display = 'block';
    try {
        const res = await fetch('/api/admin-stats');
        const stats = await res.json();
        const body = document.getElementById('admin-table-body');
        body.innerHTML = stats.map(s => `
            <tr>
                <td style="padding:10px;">${new Date(s.data).toLocaleDateString('it-IT')}</td>
                <td style="padding:10px; text-align:center;">${s.occupati}</td>
                <td style="padding:10px; text-align:center; font-weight:bold; color:${s.liberi < 10 ? 'red' : 'green'}">${s.liberi}</td>
            </tr>
        `).join('');
    } catch (e) {
        alert("Errore nel caricamento delle statistiche.");
    }
}

// Nota: Ricordati di includere la tua funzione generaCalendario() e confermaPrenotazione() qui sotto