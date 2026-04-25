let userPass = ""; let currentPrenotazioni = [];

function show(id) {
    document.querySelectorAll('.card > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

async function doLogin() {
    userPass = document.getElementById('in-npass').value.trim().toUpperCase();
    const res = await fetch('/api/valida-pass', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({npass: userPass}) });
    const data = await res.json();
    if(data.valid) {
        if(data.ruolo === 'piantone') show('view-piantone');
        else if(data.ruolo === 'admin') { show('view-admin'); mostraAdmin(); }
        else show('view-user');
    } else alert("Pass errato");
}

async function cercaPass() {
    const p = document.getElementById('search-p').value.trim().toUpperCase();
    const res = await fetch(`/api/piantone/cerca/${p}`);
    const data = await res.json();

    if(data.trovato) {
        currentPrenotazioni = data.prenotazioni;
        const p = currentPrenotazioni[0]; // Prendiamo la prenotazione del giorno
        
        document.getElementById('panel-piantone').classList.remove('hidden');
        document.getElementById('lab-pass').innerText = "PASS: " + p.npass;
        document.getElementById('lab-stato').innerText = "Stato: " + p.stato;
        
        // Formattazione Data e Ora per i campi sotto i pulsanti
        const formatInfo = (dataIso, oraIso) => {
            if(!dataIso) return "Nessun dato";
            const d = new Date(dataIso).toLocaleDateString('it-IT');
            const t = oraIso ? new Date(oraIso).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}) : "--:--";
            return `Data: ${d} <br> Ore: ${t}`;
        };

        document.getElementById('info-e').innerHTML = formatInfo(p.data_prenotata, p.orario_ingresso);
        document.getElementById('info-u').innerHTML = formatInfo(p.data_prenotata, p.orario_uscita);
        
        aggiornaVeicoli();
    } else {
        alert("Nessun pass trovato per oggi.");
    }
}

async function mossa(tipo) {
    const p = currentPrenotazioni[0];
    const res = await fetch('/api/piantone/azione', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: p.id, azione: tipo })
    });
    
    if(res.ok) {
        cercaPass(); // Ricarica i dati per mostrare l'ora appena registrata
    }
}

async function aggiornaVeicoli() {
    const res = await fetch('/api/veicoli-dentro');
    const dati = await res.json();
    document.getElementById('lista-veicoli').innerHTML = `
        <table>
            <tr><th>NPASS</th><th>Movimento</th><th>Stato</th></tr>
            ${dati.map(x => `
                <tr>
                    <td><b>${x.npass}</b></td>
                    <td>ENTRATO (${new Date(x.orario_ingresso).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})})</td>
                    <td><span class="badge" style="background:var(--green)">In Regola</span></td>
                </tr>
            `).join('')}
        </table>`;
}

async function mostraAdmin() {
    const res = await fetch('/api/admin/cruscotto');
    const dati = await res.json();
    document.getElementById('tab-admin').innerHTML = `<tr><th>Data</th><th>Occupati</th><th>Liberi</th></tr>${dati.map(x => `<tr><td>${x.data}</td><td>${x.occupati}</td><td style="color:green;font-weight:bold;">${x.liberi}</td></tr>`).join('')}`;
}