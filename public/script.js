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

        if (!response.ok) throw new Error("Errore server");

        const data = await response.json();

        if (data.valid) {
            npassCorrente = npassInput.toUpperCase();
            document.getElementById('login-section').style.display = 'none';
            
            if (data.ruolo === 'admin') {
                mostraAdminDashboard();
            } else {
                document.getElementById('calendar-section').style.display = 'block';
                generaCalendario(); // Ricrea la griglia visiva
            }
        } else {
            alert(data.message || "Accesso negato");
        }
    } catch (error) {
        alert("Errore di connessione al server.");
    }
}

// ... tieni verificaAccesso() e mostraAdminDashboard() di prima ...

function generaCalendario() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = "";
    const oggi = new Date();
    
    for (let i = 0; i < 28; i++) {
        const data = new Date();
        data.setDate(oggi.getDate() + i);
        const isoData = data.toISOString().split('T')[0];
        const giornoTesto = data.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        
        const div = document.createElement('div');
        div.className = "day-slot";
        div.innerText = giornoTesto;
        div.onclick = () => {
            div.classList.toggle('selected');
            if (div.classList.contains('selected')) giorniSelezionati.push(isoData);
            else giorniSelezionati = giorniSelezionati.filter(d => d !== isoData);
        };
        grid.appendChild(div);
    }
}

async function confermaPrenotazioni() {
    const email = document.getElementById('email-utente').value;
    if (giorniSelezionati.length === 0 || !email) return alert("Compila tutti i campi!");

    giorniSelezionati.sort();
    const res = await fetch('/api/prenota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npass: npassCorrente, giorni: giorniSelezionati, utente: email })
    });

    if (res.ok) {
        document.getElementById('calendar-section').style.display = 'none';
        document.getElementById('success-section').style.display = 'block';
        
        // Popoliamo il riepilogo SCRNS 3
        document.getElementById('success-msg').innerHTML = `Gentile utente <b>${npassCorrente}</b>, la tua prenotazione è confermata.`;
        document.getElementById('res-periodo').innerText = `dal ${formattaData(giorniSelezionati[0])} al ${formattaData(giorniSelezionati[giorniSelezionati.length-1])}`;
        document.getElementById('res-giorni').innerText = giorniSelezionati.map(d => formattaData(d)).join(', ');
    }
}

function formattaData(iso) {
    return new Date(iso).toLocaleDateString('it-IT');
}

async function mostraAdminDashboard() {
    document.getElementById('admin-section').style.display = 'block';
    const res = await fetch('/api/admin-stats');
    const stats = await res.json();
    const body = document.getElementById('admin-table-body');
    body.innerHTML = stats.map(s => `
        <tr>
            <td>${new Date(s.data).toLocaleDateString('it-IT')}</td>
            <td>${s.occupati}</td>
            <td style="font-weight:bold; color:${s.liberi < 10 ? 'red' : 'green'}">${s.liberi}</td>
        </tr>
    `).join('');
}