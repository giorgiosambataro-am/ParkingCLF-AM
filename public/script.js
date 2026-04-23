let npassCorrente = "";
let emailCorrente = "";
let giorniSelezionati = [];
let dataVisualizzata = new Date();

// 1. Inizio: Verifica Accesso
function verificaAccesso() {
    npassCorrente = document.getElementById('npass-input').value.trim();
    emailCorrente = document.getElementById('email-input').value.trim();

    // Validazione base
    if (!npassCorrente) {
        alert("Inserisci il codice NPASS!");
        return;
    }
    if (!emailCorrente || !emailCorrente.includes('@')) {
        alert("Inserisci un indirizzo email valido!");
        return;
    }

    document.getElementById('login-section').style.display = 'none';
    document.getElementById('calendar-section').style.display = 'block';
    renderizzaCalendario();
}

// 2. Navigazione Mesi
function cambiaMese(direzione) {
    dataVisualizzata.setMonth(dataVisualizzata.getMonth() + direzione);
    renderizzaCalendario();
}

// 3. Generazione Calendario
function renderizzaCalendario() {
    const contenitore = document.getElementById('calendario-gigante');
    const headerMese = document.getElementById('mese-corrente');
    contenitore.innerHTML = '';

    const anno = dataVisualizzata.getFullYear();
    const mese = dataVisualizzata.getMonth();
    
    // Nome mese e anno in italiano
    headerMese.innerText = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(dataVisualizzata);

    const primoGiornoMese = new Date(anno, mese, 1).getDay();
    const giorniNelMese = new Date(anno, mese + 1, 0).getDate();

    // Allineamento giorni (Lunedì come primo giorno)
    const offset = primoGiornoMese === 0 ? 6 : primoGiornoMese - 1;
    for (let i = 0; i < offset; i++) {
        contenitore.appendChild(document.createElement('div'));
    }

    for (let g = 1; g <= giorniNelMese; g++) {
        const divGiorno = document.createElement('div');
        divGiorno.className = 'giorno';
        const dataId = `${anno}-${(mese + 1).toString().padStart(2, '0')}-${g.toString().padStart(2, '0')}`;
        
        divGiorno.innerText = g;
        
        // Esempio: Sabati e Domeniche "pieni" (simulazione)
        const giornoSettimana = new Date(anno, mese, g).getDay();
        if (giornoSettimana === 0 || giornoSettimana === 6) {
            divGiorno.classList.add('pieno');
        } else {
            if (giorniSelezionati.includes(dataId)) divGiorno.classList.add('selezionato');
            divGiorno.onclick = () => toggleGiorno(divGiorno, dataId);
        }
        contenitore.appendChild(divGiorno);
    }
}

// 4. Selezione Giorno
function toggleGiorno(elemento, data) {
    if (giorniSelezionati.includes(data)) {
        giorniSelezionati = giorniSelezionati.filter(d => d !== data);
        elemento.classList.remove('selezionato');
    } else {
        giorniSelezionati.push(data);
        elemento.classList.add('selezionato');
    }
    document.getElementById('conteggio-giorni').innerText = giorniSelezionati.length;
    document.getElementById('btn-conferma').disabled = giorniSelezionati.length === 0;
}

// 5. Conferma e Riepilogo Finale
async function confermaPrenotazioni() {
    giorniSelezionati.sort((a, b) => new Date(a) - new Date(b));
    
    const dataInizio = formattaData(giorniSelezionati[0]);
    const dataFine = formattaData(giorniSelezionati[giorniSelezionati.length - 1]);
    const listaHtml = giorniSelezionati.map(d => `<li>${formattaData(d)}</li>`).join('');

    document.getElementById('calendar-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'block';

    document.getElementById('riepilogo-dati').innerHTML = `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
            <strong>👤 Utente:</strong> ${npassCorrente}<br>
            <strong>📧 Email:</strong> ${emailCorrente}
        </div>
        <div>
            <strong>📅 Periodo:</strong> dal ${dataInizio} al ${dataFine}<br>
            <strong>✅ Giorni confermati:</strong>
            <ul>${listaHtml}</ul>
        </div>
    `;

    // MANDIAMO TUTTO IN UN UNICO INVIO
    try {
        await fetch('/api/prenota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                npass: npassCorrente, 
                giorni: giorniSelezionati, // Inviamo l'array completo
                utente: emailCorrente 
            })
        });
    } catch (e) {
        console.error("Errore invio:", e);
    }
}

// Utility per formattare la data in italiano
function formattaData(isoDate) {
    return new Date(isoDate).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}