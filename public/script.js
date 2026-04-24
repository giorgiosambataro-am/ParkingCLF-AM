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
        const prima = currentPrenotazioni[0];
        const ultima = currentPrenotazioni[currentPrenotazioni.length - 1];
        
        document.getElementById('panel-piantone').classList.remove('hidden');
        document.getElementById('lab-pass').innerText = "PASS: " + prima.npass;
        document.getElementById('lab-stato').innerText = "Stato attuale: " + prima.stato;
        
        // Imposta le date sotto i pulsanti
        document.getElementById('date-e').innerText = new Date(prima.data_prenotata).toLocaleDateString('it-IT');
        document.getElementById('date-u').innerText = new Date(ultima.data_prenotata).toLocaleDateString('it-IT');
    } else alert("Nessuna prenotazione attiva.");
}

async function mossa(tipo) {
    const id = (tipo === 'E') ? currentPrenotazioni[0].id : currentPrenotazioni[currentPrenotazioni.length-1].id;
    await fetch('/api/piantone/azione', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({id: id, azione: tipo}) });
    alert("Operazione registrata");
    cercaPass();
}

async function mostraAdmin() {
    const res = await fetch('/api/admin/cruscotto');
    const dati = await res.json();
    document.getElementById('tab-admin').innerHTML = `<tr><th>Data</th><th>Occupati</th><th>Liberi</th></tr>${dati.map(x => `<tr><td>${x.data}</td><td>${x.occupati}</td><td style="color:green;font-weight:bold;">${x.liberi}</td></tr>`).join('')}`;
}