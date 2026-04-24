let npassCorrente = "";
let giorniSelezionati = [];
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
        } else if (data.ruolo === 'admin') {
            mostraAdmin();
        } else {
            document.getElementById('calendar-section').style.display = 'block';
            generaCalendario();
        }
    } else alert("Accesso negato.");
}

function generaCalendario() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = "";
    let d = new Date();
    for(let i=0; i<30; i++) {
        const iso = d.toISOString().split('T')[0];
        const btn = document.createElement('div');
        btn.className = "day-slot";
        btn.innerText = d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'});
        btn.onclick = () => {
            btn.classList.toggle('selected');
            if(btn.classList.contains('selected')) giorniSelezionati.push(iso);
            else giorniSelezionati = giorniSelezionati.filter(x => x !== iso);
        };
        grid.appendChild(btn);
        d.setDate(d.getDate() + 1);
    }
}

async function cercaPassPiantone() {
    const n = document.getElementById('search-npass').value.trim();
    const res = await fetch(`/api/piantone/cerca/${n}`);
    const data = await res.json();
    if (data.trovato) {
        prenotazioneAttiva = data.prenotazione;
        document.getElementById('piantone-risultato').style.display = 'block';
        document.getElementById('p-npass').innerText = `PASS: ${prenotazioneAttiva.npass}`;
        document.getElementById('p-stato').innerText = prenotazioneAttiva.stato;
        document.getElementById('btn-e').disabled = prenotazioneAttiva.stato !== 'PRENOTATO';
        document.getElementById('btn-u').disabled = prenotazioneAttiva.stato !== 'INGRESSO';
    } else alert("Nessuna prenotazione per oggi.");
}

async function azionePiantone(a) {
    await fetch('/api/piantone/azione', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({id: prenotazioneAttiva.id, azione: a, npass: prenotazioneAttiva.npass})
    });
    cercaPassPiantone();
    caricaMonitoraggio();
}

async function caricaMonitoraggio() {
    const res = await fetch('/api/piantone/monitoraggio');
    const dati = await res.json();
    const tab = document.getElementById('monitor-table');
    tab.innerHTML = `<tr><th>NPASS</th><th>Info Movimento</th><th>Stato</th></tr>`;
    tab.innerHTML += dati.map(a => `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 0;"><b>${a.npass}</b><br><small>Scad: ${a.scad}</small></td>
            <td>${a.mov}</td>
            <td><span style="background:${a.col}; color:white; padding:3px 8px; border-radius:5px; font-size:10px;">${a.et}</span></td>
        </tr>
    `).join('');
}

async function mostraAdmin() {
    document.getElementById('admin-section').style.display = 'block';
    const res = await fetch('/api/admin-stats');
    const stats = await res.json();
    document.getElementById('admin-table').innerHTML = `<tr><th>Data</th><th>Occ</th><th>Lib</th></tr>` + 
        stats.map(s => `<tr><td>${new Date(s.data).toLocaleDateString()}</td><td>${s.occupati}</td><td>${s.liberi}</td></tr>`).join('');
}

function tornaHome() { location.reload(); }