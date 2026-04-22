// Configurazione: quanti posti auto vogliamo visualizzare?
const NUMERO_POSTI = 10;
const griglia = document.getElementById('booking-grid');

// Funzione per generare la grafica all'avvio
function creaMappaPosti() {
    griglia.innerHTML = ''; // Pulisce la griglia
    
    for (let i = 1; i <= NUMERO_POSTI; i++) {
        const idPosto = `P${i}`;
        
        // Crea il quadratino del posto
        const divPosto = document.createElement('div');
        divPosto.className = 'posto-card';
        divPosto.innerHTML = `
            <h3>Posto ${idPosto}</h3>
            <input type="text" id="nota-${idPosto}" placeholder="Note (es. Targa)">
            <input type="date" id="data-${idPosto}">
            <input type="text" id="utente-${idPosto}" placeholder="Tuo Nome">
            <button onclick="preparaPrenotazione('${idPosto}')">Prenota Ora</button>
        `;
        griglia.appendChild(divPosto);
    }
}

// Funzione che raccoglie i dati dai quadratini e chiama il server
async function preparaPrenotazione(idPosto) {
    const nota = document.getElementById(`nota-${idPosto}`).value;
    const data = document.getElementById(`data-${idPosto}`).value;
    const utente = document.getElementById(`utente-${idPosto}`).value;

    if (!data || !utente) {
        alert("Per favore, inserisci almeno Data e Nome.");
        return;
    }

    await eseguiPrenotazione(idPosto, nota, data, utente);
}

// La tua funzione originale migliorata
async function eseguiPrenotazione(idPosto, nota, dataScelta, nomeUtente) {
    try {
        const response = await fetch('/api/prenota', { // Usiamo un percorso relativo, più sicuro
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                npass: idPosto, 
                nextra: nota, 
                data: dataScelta, 
                utente: nomeUtente 
            })
        });

        const risultato = await response.json();

        if (response.ok) {
            alert("✅ Prenotazione registrata con successo!");
            // Opzionale: pulisci i campi
            location.reload(); 
        } else {
            alert("❌ Errore dal server: " + (risultato.error || "Errore sconosciuto"));
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        alert("Impossibile connettersi al database.");
    }
}

// Fai partire tutto quando la pagina si carica
window.onload = creaMappaPosti;