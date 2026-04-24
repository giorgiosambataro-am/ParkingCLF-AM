let userPass = "";
let selectedDays = [];
let foundRes = null;

function show(id) {
    document.querySelectorAll('.card > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

async function doLogin() {
    userPass = document.getElementById('in-npass').value.trim().toUpperCase();
    if(!userPass) return;
    const res = await fetch('/api/valida-pass', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({npass: userPass})
    });
    const data = await res.json();
    if(data.valid) {
        if(data.ruolo === 'piantone') { show('view-piantone'); aggiornaMonitor(); }
        else { show('view-user'); buildCal(); }
    } else alert("Pass errato");
}

function buildCal() {
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = "";
    let d = new Date();
    for(let i=0; i<30; i++) {
        const iso = d.toISOString().split('T')[0];
        const slot = document.createElement('div');
        slot.className = "day-slot";
        slot.innerText = d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'});
        slot.onclick = () => {
            slot.classList.toggle('selected');
            if(slot.classList.contains('selected')) selectedDays.push(iso);
            else selectedDays = selectedDays.filter(x => x !== iso);
        };
        grid.appendChild(slot);
        d.setDate(d.getDate() + 1);
    }
}

async function inviaPren() {
    const email = document.getElementById('u-email').value;
    if(selectedDays.length === 0) return alert("Seleziona i giorni");
    if(!email) return alert("Inserisci la mail per la conferma");

    const res = await fetch('/api/prenota', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({npass: userPass, giorni: selectedDays, email: email})
    });
    if(res.ok) { alert("Prenotazione Inviata e Mail in arrivo!"); location.reload(); }
}

async function cercaPass() {
    const p = document.getElementById('search-p').value.trim();
    const res = await fetch(`/api/piantone/cerca/${p}`);
    const data = await res.json();
    if(data.trovato) {
        foundRes = data.prenotazione;
        document.getElementById('panel-piantone').classList.remove('hidden');
        document.getElementById('lab-pass').innerText = foundRes.npass;
        document.getElementById('lab-stato').innerText = foundRes.stato;
        
        // Orari sotto i tasti
        document.getElementById('time-e').innerText = foundRes.orario_ingresso ? 
            `Entrato: ${new Date(foundRes.orario_ingresso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : "Non entrato";
        document.getElementById('time-u').innerText = foundRes.orario_uscita ? 
            `Uscito: ${new Date(foundRes.orario_uscita).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : "Non uscito";

        document.getElementById('b-e').disabled = foundRes.stato !== 'PRENOTATO';
        document.getElementById('b-u').disabled = foundRes.stato !== 'INGRESSO';
    } else alert("Nessuna prenotazione trovata");
}

async function mossa(tipo) {
    await fetch('/api/piantone/azione', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({id: foundRes.id, azione: tipo, npass: foundRes.npass})
    });
    cercaPass(); aggiornaMonitor();
}

async function aggiornaMonitor() {
    const res = await fetch('/api/riepilogo-totale');
    const dati = await res.json();
    const tab = document.getElementById('tab-monitor');
    const dentro = dati.filter(x => x.stato === 'INGRESSO');
    tab.innerHTML = `<tr><th>PASS</th><th>INGRESSO</th><th>STATO</th></tr>`;
    tab.innerHTML += dentro.map(x => `
        <tr>
            <td><b>${x.npass}</b><br>Scad: ${new Date(x.data_prenotata).toLocaleDateString()}</td>
            <td> Ore ${new Date(x.orario_ingresso).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</td>
            <td><span style="color:green; font-weight:bold;">DENTRO</span></td>
        </tr>`).join('');
}

async function mostraRiepilogo() {
    show('view-summary');
    const res = await fetch('/api/riepilogo-totale');
    const dati = await res.json();
    const tab = document.getElementById('tab-summary');
    tab.innerHTML = `<tr><th>DATA</th><th>PASS</th><th>STATO</th><th>ORARI</th></tr>`;
    tab.innerHTML += dati.map(x => `
        <tr>
            <td>${new Date(x.data_prenotata).toLocaleDateString()}</td>
            <td>${x.npass}</td>
            <td>${x.stato}</td>
            <td>I: ${x.orario_ingresso ? new Date(x.orario_ingresso).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'}) : '--'}<br>
                U: ${x.orario_uscita ? new Date(x.orario_uscita).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'}) : '--'}</td>
        </tr>`).join('');
}