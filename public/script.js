let userPass = ""; let selectedDays = []; let currentPren = null;

function show(id) {
    document.querySelectorAll('.card > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

async function doLogin() {
    userPass = document.getElementById('in-npass').value.trim().toUpperCase();
    if(!userPass) return;
    const res = await fetch('/api/valida-pass', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({npass:userPass}) });
    const data = await res.json();
    if(data.valid) {
        if(data.ruolo === 'piantone') { show('view-piantone'); aggiornaVeicoli(); }
        else if(data.ruolo === 'admin') { show('view-admin'); mostraAdmin(); }
        else { show('view-user'); buildCal(); }
    } else alert("Accesso Negato");
}

function buildCal() {
    const grid = document.getElementById('cal-grid'); grid.innerHTML = ""; selectedDays = [];
    let d = new Date();
    for(let i=0; i<45; i++) {
        const iso = d.toISOString().split('T')[0];
        const slot = document.createElement('div'); slot.className = "day-slot";
        slot.innerText = d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'});
        slot.onclick = () => { slot.classList.toggle('selected'); if(slot.classList.contains('selected')) selectedDays.push(iso); else selectedDays = selectedDays.filter(x => x !== iso); };
        grid.appendChild(slot); d.setDate(d.getDate() + 1);
    }
}

async function inviaPren() {
    const email = document.getElementById('u-email').value;
    if(!selectedDays.length || !email) return alert("Dati mancanti!");
    const res = await fetch('/api/prenota', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({npass:userPass, giorni:selectedDays, email:email}) });
    if(res.ok) {
        selectedDays.sort();
        document.getElementById('summary-details').innerHTML = `
            <div class="summary-item"><b>Pass:</b> ${userPass}</div>
            <div class="summary-item"><b>Email:</b> ${email}</div>
            <div class="summary-item"><b>Dal:</b> ${new Date(selectedDays[0]).toLocaleDateString('it-IT')}</div>
            <div class="summary-item"><b>Al:</b> ${new Date(selectedDays[selectedDays.length-1]).toLocaleDateString('it-IT')}</div>
        `;
        show('view-success');
    }
}

async function mostraMie() {
    show('view-my-list');
    const res = await fetch(`/api/mie-prenotazioni/${userPass}`);
    const dati = await res.json();
    document.getElementById('my-list-content').innerHTML = dati.map(p => `
        <div style="padding:10px; background:#f8fafc; border-radius:10px; margin:5px 0; font-size:14px;">
            📅 Dal ${new Date(p.data_inizio).toLocaleDateString('it-IT')} al ${new Date(p.data_fine).toLocaleDateString('it-IT')} <br>
            <b>Stato: ${p.stato}</b>
        </div>
    `).join('') || "Nessuna prenotazione attiva.";
}

async function cercaPass() {
    const p = document.getElementById('search-p').value.trim().toUpperCase();
    const res = await fetch(`/api/piantone/cerca/${p}`);
    const data = await res.json();
    if(data.trovato) {
        currentPren = data.prenotazione;
        document.getElementById('panel-piantone').classList.remove('hidden');
        document.getElementById('lab-pass').innerHTML = `PASS: ${currentPren.npass} <br> <span style="font-size:12px; color:gray;">(Periodo: ${new Date(currentPren.data_inizio).toLocaleDateString('it-IT')} - ${new Date(currentPren.data_fine).toLocaleDateString('it-IT')})</span>`;
        
        const fmt = (t) => t ? `Registrato il ${new Date(t).toLocaleDateString('it-IT')} <br> Ore ${new Date(t).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}` : "--/--/----<br>--:--";
        document.getElementById('info-e').innerHTML = fmt(currentPren.orario_ingresso);
        document.getElementById('info-u').innerHTML = fmt(currentPren.orario_uscita);
    } else alert("Nessuna prenotazione trovata per questo pass.");
}

async function mossa(tipo) {
    if(!currentPren) return;
    await fetch('/api/piantone/azione', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:currentPren.id, azione:tipo}) });
    cercaPass(); aggiornaVeicoli();
}

async function aggiornaVeicoli() {
    const res = await fetch('/api/veicoli-dentro');
    const dati = await res.json();
    document.getElementById('lista-veicoli').innerHTML = `<table><tr><th>PASS</th><th>Ingresso</th></tr>${dati.map(x => `<tr><td><b>${x.npass}</b></td><td>${new Date(x.orario_ingresso).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'})}</td></tr>`).join('')}</table>`;
}

async function mostraAdmin() {
    const res = await fetch('/api/admin/cruscotto');
    const dati = await res.json();
    document.getElementById('tab-admin').innerHTML = `<tr><th>Data</th><th>Liberi</th></tr>${dati.map(x => `<tr><td>${x.data}</td><td style="color:var(--green); font-weight:bold;">${x.liberi} / 120</td></tr>`).join('')}`;
}
