let npassCorrente = "";
let emailCorrente = "";
let giorniSelezionati = [];
let dataVisualizzata = new Date(); // Parte da oggi

function verificaAccesso() {
    npassCorrente = document.getElementById('npass-input').value.trim();
    emailCorrente = document.getElementById('email-input').value.trim();

    if (!npassCorrente || !emailCorrente.includes('@')) {
        alert("Inserisci un NPASS valido e una Email corretta!");
        return;
    }

    document.getElementById('login-section').style.display = 'none';
    document.getElementById('calendar-section').style.display = 'block';
    renderizzaCalendario();
}

function cambiaMese(direzione) {
    dataVisualizzata.setMonth(dataVisualizzata.getMonth() + direzione);
    renderizzaCalendario();
}

function renderizzaCalendario() {
    const contenitore = document.getElementById('calendario-gigante');
    const headerMese = document.getElementById('mese-corrente');
    contenitore.innerHTML = '';

    const anno = dataVisualizzata.getFullYear();
    const mese = dataVisualizzata.getMonth();
    
    headerMese.innerText = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(dataVisualizzata);

    const primoGiornoMese = new Date(anno, mese, 1).getDay();
    const giorniNelMese = new Date(anno, mese + 1, 0).getDate();

    // Spazi vuoti per i giorni della settimana precedente
    for (let i = 0; i < (primoGiornoMese === 0 ? 6 : primoGiornoMese - 1); i++) {
        contenitore.appendChild(document.createElement('div'));
    }

    for (let g = 1; g <= giorniNelMese; g++) {
        const divGiorno = document.createElement('div');
        divGiorno.className = 'giorno';
        const dataId = `${anno}-${(mese + 1).toString().padStart(2, '0')}-${g.toString().padStart(2, '0')}`;
        
        divGiorno.innerText = g;
        
        // Simulazione "Esaurito" senza citare i 120 (es. tutti i Sabati pieni)
        const giornoSettimana = new Date(anno, mese, g).getDay();
        if (giornoSettimana === 6) { // Sabato
            divGiorno.classList.add('pieno');
            divGiorno.title = "Posti esauriti";
        } else {
            if (giorniSelezionati.includes(dataId)) divGiorno.classList.add('selezionato');
            divGiorno.onclick = () => toggleGiorno(divGiorno, dataId);
        }
        contenitore.appendChild(divGiorno);
    }
}

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

async function confermaPrenotazioni() {
    // Ordiniamo le date per il riepilogo
    giorniSelezionati.sort();
    const dataInizio = giorniSelezionati[0];
    const dataFine = giorniSelezionati[giorniSelezionati.length - 1];

    // Mostra caricamento (opzionale)
    document.getElementById('calendar-section').style.display = 'none';
    const successSection = document.getElementById('success-section');
    successSection.style.display = 'block';

    document.getElementById('riepilogo-dati').innerHTML = `
        <strong>Utente:</strong> ${npassCorrente}<br>
        <strong>Email:</strong> ${emailCorrente}<br>
        <strong>Periodo:</strong> dal ${formattaData(dataInizio)} al ${formattaData(dataFine)}<br>
        <strong>Totale giorni:</strong> ${giorniSelezionati.length}
    `;

    // Qui invieresti i dati al server (API)
    for (let d of giorniSelezionati) {
        fetch('/api/prenota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npass: npassCorrente, data: d, utente: emailCorrente })
        });
    }
}

function formattaData(isoDate) {
    const d = new Date(isoDate);
    return d.toLocaleDateString('it-IT');
}
