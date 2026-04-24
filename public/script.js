let userPass = "";
let selectedDays = [];

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
    if(data.valid) { show('view-user'); buildCal(); }
    else alert("Accesso negato");
}

function buildCal() {
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = ""; selectedDays = [];
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
    if(selectedDays.length === 0 || !email) return alert("Inserisci dati e scegli giorni!");
    const res = await fetch('/api/prenota', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({npass: userPass, giorni: selectedDays, email: email})
    });
    if(res.ok) {
        show('view-success');
        document.getElementById('summary-details').innerHTML = `
            <b>Pass:</b> ${userPass}<br><b>Email:</b> ${email}<br>
            <b>Date:</b> ${selectedDays.sort().map(d => new Date(d).toLocaleDateString('it-IT')).join(', ')}
        `;
    }
}

async function mostraMie() {
    show('view-my-list');
    const res = await fetch(`/api/mie-prenotazioni/${userPass}`);
    const dati = await res.json();
    document.getElementById('my-list-content').innerHTML = dati.map(p => `
        <div class="pren-item">
            <span>✅</span> <b>${new Date(p.data_prenotata).toLocaleDateString('it-IT')}</b>
        </div>`).join('') || "Nessuna prenotazione attiva.";
}

async function eliminaTutte() {
    if(confirm("Vuoi cancellare tutte le tue prenotazioni future?")) {
        await fetch('/api/elimina-tutte', {
            method: 'POST', headers: {'Content-Type':'application/json'},
            body: JSON.stringify({npass: userPass})
        });
        mostraMie();
    }
}

async function mostraAdmin() {
    show('view-admin');
    const res = await fetch('/api/admin/cruscotto');
    const dati = await res.json();
    document.getElementById('tab-admin').innerHTML = `
        <tr><th>Data</th><th>Occupati</th><th>Liberi</th></tr>
        ${dati.map(x => `<tr><td>${x.data}</td><td>${x.occupati}</td><td class="num-liberi">${x.liberi}</td></tr>`).join('')}
    `;
}