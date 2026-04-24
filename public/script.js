let npassCorrente = "";
let giorniSelezionati = [];

/**
 * LOGIN: Verifica il pass e decide se mostrare il calendario o il pannello admin
 */
async function verificaAccesso() {
    const npassInput = document.getElementById('npass').value.trim();
    if (!npassInput) return alert("Per favore, inserisci un NPASS valido.");

    try {
        const response = await fetch('/api/valida-pass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npass: npassInput })
        });

        const data = await response.json();

        if (data.valid) {
            npassCorrente = npassInput.toUpperCase();
            document.getElementById('login-section').style.display = 'none';
            
            if (data.ruolo === 'admin') {
                mostraAdminDashboard();
            } else {
                document.getElementById('calendar-section').style.display = 'block';
                generaCalendario();
            }
        } else {
            alert(data.message || "Accesso negato: Pass non trovato.");
        }
    } catch (error) {
        console.error("Errore login:", error);
        alert("Errore di connessione al server.");
    }
}

/**
 * CALENDARIO: Genera i giorni da oggi fino alla fine del mese successivo
 */
function generaCalendario() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = "";
    giorniSelezionati = []; // Reset selezione
    
    const oggi = new Date();
    // Calcola l'ultimo giorno del mese successivo
    const fineMeseSuccessivo = new Date(oggi.getFullYear(), oggi.getMonth() + 2, 0);
    
    let dataCursore = new Date(oggi);

    while (dataCursore <= fineMeseSuccessivo) {
        const isoData = dataCursore.toISOString().split('T')[0];
        const giornoTesto = dataCursore.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        
        const div = document.createElement('div');
        div.className = "day-slot";
        div.innerText = giornoTesto;
        
        div.onclick = () => {
            div.classList.toggle('selected');
            if (div.classList.contains('selected')) {
                giorniSelezionati.push(isoData);
            } else {
                giorniSelezionati = giorniSelezionati.filter(d => d !== isoData);
            }
        };
        
        grid.appendChild(div);
        dataCursore.setDate(dataCursore.getDate() + 1);
    }
}

/**
 * PRENOTAZIONE CON GESTIONE ERRORI DI DUPLICATI
 */
async function confermaPrenotazioni() {
    const email = document.getElementById('email-utente').value.trim();
    if (giorniSelezionati.length === 0) return alert("Seleziona almeno un giorno sul calendario!");
    if (!email) return alert("Inserisci la tua email per ricevere la conferma.");

    // Ordiniamo le date cronologicamente
    giorniSelezionati.sort();

    try {
        const res = await fetch('/api/prenota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                npass: npassCorrente, 
                giorni: giorniSelezionati, 
                utente: email 
            })
        });

        // GESTIONE DEI DUPLICATI DALLA RISPOSTA DEL SERVER
        if (res.status === 409) {
            const dataError = await res.json();
            alert(`⚠️ ATTENZIONE: ${dataError.error}`);
            // Purtroppo non possiamo farti prenotare, controlla le tue prenotazioni
            tornaAlCalendario();
            return;
        }

        if (res.ok) {
            const periodo = `dal ${formattaData(giorniSelezionati[0])} al ${formattaData(giorniSelezionati[giorniSelezionati.length-1])}`;
            const elenco = `${giorniSelezionati.length} (${giorniSelezionati.map(d => formattaData(d)).join(', ')})`;

            document.getElementById('calendar-section').style.display = 'none';
            document.getElementById('success-section').style.display = 'block';
            
            document.getElementById('success-msg').innerHTML = `Gentile utente <b>${npassCorrente}</b>, la tua prenotazione è confermata.`;
            document.getElementById('res-periodo').innerText = periodo;
            document.getElementById('res-giorni').innerText = elenco;
        } else {
            alert("Errore durante il salvataggio della prenotazione.");
        }
    } catch (e) {
        alert("Errore di rete. Riprova più tardi.");
    }
}

/**
 * GESTIONE PERSONALE: Mostra le prenotazioni già effettuate (con chicca DISTINTA)
 */
async function mostraMiePrenotazioni() {
    try {
        const res = await fetch(`/api/mie-prenotazioni/${npassCorrente}`);
        const dati = await res.json();
        
        const lista = document.getElementById('list-reservations');
        lista.innerHTML = dati.length > 0 
            ? dati.map(p => `<div class="summary-item">✅ ${formattaData(p.data_prenotata)}</div>`).join('')
            : "<p>Non hai prenotazioni attive per il futuro.</p>";
            
        document.getElementById('calendar-section').style.display = 'none';
        document.getElementById('my-reservations-section').style.display = 'block';
    } catch (e) {
        alert("Impossibile recuperare le tue prenotazioni.");
    }
}

/**
 * ELIMINAZIONE: Cancella tutte le prenotazioni future dell'utente
 */
async function eliminaTuttePrenotazioni() {
    if (!confirm("ATTENZIONE: Sei sicuro di voler eliminare TUTTE le tue prenotazioni future? L'azione non è reversibile.")) return;
    
    try {
        const res = await fetch(`/api/elimina-prenotazioni/${npassCorrente}`, { method: 'DELETE' });
        if (res.ok) {
            alert("Tutte le tue prenotazioni sono state cancellate con successo.");
            location.reload(); // Ricarica per pulire tutto
        }
    } catch (e) {
        alert("Errore durante l'eliminazione.");
    }
}

/**
 * ADMIN: Carica le statistiche dei posti occupati
 */
async function mostraAdminDashboard() {
    document.getElementById('admin-section').style.display = 'block';
    try {
        const res = await fetch('/api/admin-stats');
        const stats = await res.json();
        const body = document.getElementById('admin-table-body');
        
        body.innerHTML = stats.map(s => `
            <tr>
                <td>${formattaData(s.data)}</td>
                <td>${s.occupati}</td>
                <td style="font-weight:bold; color:${s.liberi < 20 ? '#ef4444' : '#22c55e'}">${s.liberi}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Errore stats:", e);
    }
}

/**
 * UTILS: Helper funzioni grafiche
 */
function formattaData(isoString) {
    return new Date(isoString).toLocaleDateString('it-IT');
}

function tornaAlCalendario() {
    document.getElementById('my-reservations-section').style.display = 'none';
    document.getElementById('calendar-section').style.display = 'block';
}