let npassCorrente = "";
let prenotazioneAttiva = null;

async function verificaAccesso() {
    const input = document.getElementById('npass').value.trim();
    if (!input) return;
    const res = await fetch('/api/valida-pass', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({npass: input})
    });
    const data = await res.json();
    if (data.valid) {
        npassCorrente = input.toUpperCase();
        document.getElementById('login-section').style.display = 'none';
        if (data.ruolo === 'piantone') { 
            document.getElementById('piantone-section').style.display = 'block';
            caricaMonitoraggio();
        } else { alert("Accesso Client/Admin non mostrato in questa demo"); }
    } else alert("Pass errato");
}

async function cercaPassPiantone() {
    const n = document.getElementById('search-npass').value.trim();
    const res = await fetch(`/api/piantone/cerca/${n}`);
    const data = await res.json();
    const box = document.getElementById('piantone-risultato');
    if (data.trovato) {
        prenotazioneAttiva = data.prenotazione;
        box.style.display = 'block';
        document.getElementById('p-npass').innerText = `PASS: ${prenotazioneAttiva.npass}`;
        document.getElementById('p-info-stato').innerText = `Stato attuale: ${prenotazioneAttiva.stato}`;
        document.getElementById('btn-e').disabled = prenotazioneAttiva.stato !== 'PRENOTATO';
        document.getElementById('btn-u').disabled = prenotazioneAttiva.stato !== 'INGRESSO';
    } else alert("Nessuna prenotazione attiva per oggi");
}

async function azionePiantone(a) {
    const res = await fetch('/api/piantone/azione', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({id: prenotazioneAttiva.id, azione: a, npass: prenotazioneAttiva.npass})
    });
    if (res.ok) {
        alert("Operazione registrata!");
        cercaPassPiantone();
        caricaMonitoraggio();
    }
}

async function caricaMonitoraggio() {
    const res = await fetch('/api/piantone/monitoraggio');
    const dati = await res.json();
    const tab = document.getElementById('monitor-table');
    tab.innerHTML = `<tr><th>NPASS</th><th>Info Movimento</th><th>Stato</th></tr>`;
    tab.innerHTML += dati.map(a => `
        <tr>
            <td><b>${a.npass}</b><br><small>Scad: ${a.fine}</small></td>
            <td><small>${a.info}</small></td>
            <td><span class="status-tag" style="background:${a.colore}">${a.etichetta}</span></td>
        </tr>
    `).join('');
}