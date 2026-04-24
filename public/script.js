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

function generaCalendario() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = "";
    const oggi = new Date();
    
    // Genera i prossimi 30 giorni
    for (let i = 0; i < 30; i++) {
        const data = new Date();
        data.setDate(oggi.getDate() + i);
        const isoData = data.toISOString().split('T')[0];
        const giornoTesto = data.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        
        const div = document.createElement('div');
        div.className = "day-slot";
        div.innerText = giornoTesto;
        
        div.onclick = () => {
            if (div.classList.contains('selected')) {
                div.classList.remove('selected');
                giorniSelezionati = giorniSelezionati.filter(d => d !== isoData);
            } else {
                div.classList.add('selected');
                giorniSelezionati.push(isoData);
            }
        };
        grid.appendChild(div);
    }
}

async function confermaPrenotazioni() {
    const email = document.getElementById('email-utente').value;
    if (giorniSelezionati.length === 0) return alert("Seleziona almeno un giorno!");
    if (!email) return alert("Inserisci la tua email per la ricevuta!");

    try {
        const res = await fetch('/api/prenota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                npass: npassCorrente, 
                giorni: giorniSelezionati.sort(), 
                utente: email 
            })
        });

        if (res.ok) {
            document.getElementById('calendar-section').style.display = 'none';
            document.getElementById('success-section').style.display = 'block';
        } else {
            alert("Errore durante il salvataggio.");
        }
    } catch (e) {
        alert("Errore di rete.");
    }
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