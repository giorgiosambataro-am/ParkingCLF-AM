async function eseguiPrenotazione(idPosto, nota, dataScelta, nomeUtente) {
    try {
        // Sostituisci l'URL con quello che ti ha dato Render
        const response = await fetch('https://IL-TUO-LINK-SU-RENDER.onrender.com/api/prenota', {
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
            alert("✅ " + risultato.message);
            // Qui potresti ricaricare la pagina per aggiornare la disponibilità
        } else {
            alert("❌ Errore: " + risultato.error);
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        alert("Impossibile connettersi al server.");
    }
}