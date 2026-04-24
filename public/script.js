let npassCorrente = "";
let giorniSelezionati = [];
let prenotazioneAttiva = null;

async function verificaAccesso() {
    const input = document.getElementById('npass').value.trim();
    if (!input) return;
    const res = await fetch('/api/valida-pass', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({npass: input})});
    const data = await res.json();
    if (data.valid) {
        npassCorrente = input.toUpperCase();
        document.getElementById('login-section').style.display = 'none';
        if (data.ruolo === 'admin') mostraAdminDashboard();
        else if (data.ruolo === 'piantone') { 
            document.getElementById('piantone-section').style.display = 'block';
            caricaMonitoraggio();
        } else {
            document.getElementById('calendar-section').style.display = 'block';
            generaCalendario();
        }
    } else alert("Pass errato");
}

function generaCalendario() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = "";
    const oggi = new Date();
    const fine = new Date(oggi.getFullYear(), oggi.getMonth() + 2, 0);
    let d = new Date(oggi);
    while (d <= fine) {
        const iso = d.toISOString().split('T')[0];
        const btn = document.createElement('div');
        btn.className = "day-slot";
        btn.innerText = d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'});
        btn.onclick = () => {
            btn.classList.toggle('selected');
            if (btn.classList.contains('selected')) giorniSelezionati.push(iso);
            else giorniSelezionati = giorniSelezionati.filter(x => x !== iso);
        };
        grid.appendChild(btn);
        d.setDate(d.getDate() + 1);
    }
}

async function confermaPrenotazioni() {
    const email = document.getElementById('email-utente').value;
    if (!email || giorniSelezionati.length === 0) return alert("Compila tutto");
    const res = await fetch('/api/prenota', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({npass: npassCorrente, giorni: giorniSelezionati, utente: email})});
    if (res.status === 409) alert("Date già occupate!");
    else if (res.ok) {
        document.getElementById('calendar-section').style.display = 'none';
        document.getElementById('success-section').style.display = 'block';
        document.getElementById('res-periodo').innerText = `Dal ${formatDate(giorniSelezionati[0])} al ${formatDate(giorniSelezionati[giorniSelezionati.length-1])}`;
        document.getElementById('res-giorni').innerText = `${giorniSelezionati.length} (${giorniSelezionati.map(formatDate).join(', ')})`;
    }
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
        document.getElementById('p-stato').innerText = prenotazioneAttiva.stato;
        document.getElementById('btn-e').disabled = prenotazioneAttiva.stato !== 'PRENOTATO';
        document.getElementById('btn-u').disabled = prenotazioneAttiva.stato !== 'INGRESSO';
    } else alert("Nessuna prenotazione per oggi");
}

async function azionePiantone(a) {
    await fetch('/api/piantone/azione', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: prenotazioneAttiva.id, azione: a, npass: prenotazioneAttiva.npass})});
    alert("Operazione completata");
    cercaPassPiantone();
    caricaMonitoraggio();
}

async function caricaMonitoraggio() {
    const res = await fetch('/api/piantone/monitoraggio');
    const dati = await res.json();
    const tab = document.getElementById('monitor-table');
    tab.innerHTML = dati.map(a => `<tr><td>${a.npass}</td><td>${a.fine}</td><td><span style="color:white; background:${a.colore}; padding:2px 5px; border-radius:5px;">${a.etichetta}</span></td></tr>`).join('');
}

async function mostraMiePrenotazioni() {
    const res = await fetch(`/api/mie-prenotazioni/${npassCorrente}`);
    const dati = await res.json();
    document.getElementById('list-reservations').innerHTML = dati.map(p => `<div class="summary-item">✅ ${formatDate(p.data_prenotata)}</div>`).join('');
    document.getElementById('calendar-section').style.display = 'none';
    document.getElementById('my-reservations-section').style.display = 'block';
}

function tornaAlCalendario() { document.getElementById('my-reservations-section').style.display = 'none'; document.getElementById('calendar-section').style.display = 'block'; }
function formatDate(s) { return new Date(s).toLocaleDateString('it-IT'); }

async function mostraAdminDashboard() {
    document.getElementById('admin-section').style.display = 'block';
    const res = await fetch('/api/admin-stats');
    const stats = await res.json();
    document.getElementById('admin-table-body').innerHTML = stats.map(s => `<tr><td>${formatDate(s.data)}</td><td>${s.occupati}</td><td>${s.liberi}</td></tr>`).join('');
}