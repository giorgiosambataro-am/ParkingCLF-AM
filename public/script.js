let userPass = ""; let selectedDays = []; let foundRes = null;

function show(id) {
    document.querySelectorAll('.card > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

async function doLogin() {
    userPass = document.getElementById('in-npass').value.trim().toUpperCase();
    const res = await fetch('/api/valida-pass', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({npass: userPass}) });
    const data = await res.json();
    if(data.valid) {
        if(data.ruolo === 'piantone') { show('view-piantone'); aggiornaVeicoli(); }
        else if(data.ruolo === 'admin') { show('view-admin'); mostraAdmin(); }
        else { show('view-user'); buildCal(); }
    } else alert("Accesso negato");
}

function buildCal() {
    const grid = document.getElementById('cal-grid'); grid.innerHTML = ""; selectedDays = [];
    let d = new Date();
    for(let i=0; i<30; i++) {
        const iso = d.toISOString().split('T')[0];
        const slot = document.createElement('div'); slot.className = "day-slot";
        slot.innerText = d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'});
        slot.onclick = () => { slot.classList.toggle('selected'); if(slot.classList.contains('selected')) selectedDays.push(iso); else selectedDays = selectedDays.filter(x => x !== iso); };
        grid.appendChild(slot); d.setDate(d.getDate() + 1);
    }
}

async function inviaPren() {
    const email = document.getElementById('u-email').value;
    if(!selectedDays.length || !email) return alert("Inserisci dati!");
    const res = await fetch('/api/prenota', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({npass: userPass, giorni: selectedDays, email: email}) });
    if(res.ok) {
        show('view-success');
        document.getElementById('summary-details').innerHTML = `<b>Pass:</b> ${userPass}<br><b>Email:</b> ${email}<br><b>Date:</b> ${selectedDays.sort().map(d => new Date(d).toLocaleDateString('it-IT')).join(', ')}`;
    }
}

async function mostraMie() {
    show('view-my-list');
    const res = await fetch(`/api/mie-prenotazioni/${userPass}`);
    const dati = await res.json();
    document.getElementById('my-list-content').innerHTML = dati.map(p => `<div style="background:var(--light);padding:12px;margin:8px 0;border-radius:10px;display:flex;align-items:center;gap:10px;"><span>✅</span> <b>${new Date(p.data_prenotata).toLocaleDateString('it-IT')}</b></div>`).join('') || "Nessuna prenotazione.";
}

async function cercaPass() {
    const p = document.getElementById('search-p').value.trim().toUpperCase();
    const res = await fetch(`/api/piantone/cerca/${p}`);
    const data = await res.json();
    if(data.trovato) {
        foundRes = data.prenotazione;
        document.getElementById('panel-piantone').classList.remove('hidden');
        document.getElementById('lab-pass').innerText = "PASS: " + foundRes.npass;
        document.getElementById('lab-stato').innerText = "Stato attuale: " + foundRes.stato;
    } else alert("Nessuna prenotazione trovata per oggi.");
}

async function mossa(tipo) {
    if(!foundRes) return;
    await fetch('/api/piantone/azione', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: foundRes.id, azione: tipo}) });
    cercaPass(); aggiornaVeicoli();
}

async function aggiornaVeicoli() {
    const res = await fetch('/api/veicoli-dentro');
    const dati = await res.json();
    document.getElementById('lista-veicoli').innerHTML = `<table><tr><th>NPASS</th><th>Movimento</th><th>Stato</th></tr>${dati.map(x => `<tr><td><b>${x.npass}</b></td><td>INGRESSO (${new Date(x.orario_ingresso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})})</td><td><span class="badge" style="background:var(--green)">In Regola</span></td></tr>`).join('')}</table>`;
}

async function mostraAdmin() {
    const res = await fetch('/api/admin/cruscotto');
    const dati = await res.json();
    document.getElementById('tab-admin').innerHTML = `<tr><th>Data</th><th>Occupati</th><th>Liberi</th></tr>${dati.map(x => `<tr><td>${x.data}</td><td>${x.occupati}</td><td style="color:var(--green);font-weight:bold;">${x.liberi}</td></tr>`).join('')}`;
}