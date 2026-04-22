let npassCorrente = "";
let giorniSelezionati = [];
const LIMITE_POSTI = 120; // Capacità massima

// 1. Funzione di Accesso
function verificaAccesso() {
    const npass = document.getElementById('npass-input').value.trim();
    if (npass === "") {
        alert("Inserisci un NPASS valido!");
        return;
    }
    // Qui in futuro faremo un controllo col secondo database.
    // Per ora, se scrive qualcosa, lo facciamo entrare.
    npassCorrente = npass;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('calendar-section').style.display = 'block';
    
    generaCalendario();
}

// 2. Generazione del Calendario (Mese corrente semplificato)
function generaCalendario() {
    const contenitore = document.getElementById('calendario-gigante');
    contenitore.innerHTML = '';
    
    // Creiamo 30 giorni fittizi per la demo
    for (let i = 1; i <= 30; i++) {
        let divGiorno = document.createElement('div');
        divGiorno.className = 'giorno';
        
        // Formattiamo la data (es. 2026-05-01)
        let dataTesto = `2026-05-${i.toString().padStart(2, '0')}`;
        divGiorno.innerText = i;
        divGiorno.dataset.data = dataTesto;

        // SIMULAZIONE: Facciamo finta che il giorno 15 sia PIENO (120 posti occupati)
        if (i === 15) {
            divGiorno.classList.add('pieno');
            divGiorno.title = "Al completo per questo giorno";
            divGiorno.onclick = () => alert("Questo giorno ha già raggiunto i 120 posti prenotati.");
        } else {
            // Giorno cliccabile e prenotabile
            divGiorno.onclick = () => selezionaGiorno(divGiorno, dataTesto);
        }
        
        contenitore.appendChild(divGiorno);
    }
}

// 3. Selezione dei giorni
function selezionaGiorno(elemento, data) {
    if (elemento.classList.contains('selezionato')) {
        // Deseleziona
        elemento.classList.remove('selezionato');
        giorniSelezionati = giorniSelezionati.filter(d => d !== data);
    } else {
        // Seleziona
        elemento.classList.add('selezionato');
        giorniSelezionati.push(data);
    }
    
    document.getElementById('conteggio-giorni').innerText = giorniSelezionati.length;
    document.getElementById('btn-conferma').disabled = giorniSelezionati.length === 0;
}

// 4. Invio multiplo al Server
async function confermaPrenotazioni() {
    // Invia una richiesta per ogni giorno selezionato
    for (let data of giorniSelezionati) {
        await inviaSingolaPrenotazione(data);
    }
    alert("✅ Tutte le giornate sono state prenotate!");
    location.reload(); // Riavvia l'app
}

async function inviaSingolaPrenotazione(dataScelta) {
    try {
        const response = await fetch('/api/prenota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                npass: npassCorrente, // Usiamo l'npass inserito all'inizio
                nextra: "Prenotazione Multipla V2", 
                data: dataScelta, 
                utente: npassCorrente // Per ora usiamo npass anche qui
            })
        });
        if (!response.ok) console.error("Errore salvataggio giorno:", dataScelta);
    } catch (error) {
        console.error("Errore di rete:", error);
    }
}
