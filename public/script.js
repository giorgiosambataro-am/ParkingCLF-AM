let userPass = "";
let selectedDays = [];
let foundRes = null;

// Funzione per navigare tra le schermate
function show(id) {
    document.querySelectorAll('.card > div').forEach(d => d.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

// --- LOGICA LOGIN ---
async function doLogin() {
    const input = document.getElementById('in-npass');
    userPass = input.value.trim().toUpperCase();
    if (!userPass) return;

    try {
        const res = await fetch('/api/valida-pass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npass: userPass })
        });
        const data = await res.json();

        if (data.valid) {
            if (data.ruolo === 'piantone') {
                show('view-piantone');
                aggiornaMonitor();
            } else {
                show('view-user');
                buildCal();
            }
        } else {
            alert("Pass non valido o non autorizzato");
        }
    } catch (e) {
        console.error("Errore login:", e);
    }
}

// --- LOGICA UTENTE (Calendario e Prenotazione) ---
function buildCal() {
    const grid = document.getElementById('cal-grid');
    grid.innerHTML = "";
    selectedDays = [];
    let d = new Date();

    for (let i = 0; i < 30; i++) {
        const iso = d.toISOString().split('T')[0];
        const slot = document.createElement('div');
        slot.className = "day-slot";
        slot.innerText = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        
        slot.onclick = () => {
            slot.classList.toggle('selected');
            if (slot.classList.contains('selected')) {
                selectedDays.push(iso);
            } else {
                selectedDays = selectedDays.filter(x => x !== iso);
            }
        };
        grid.appendChild(slot);
        d.setDate(d.getDate() + 1);
    }
}

async function inviaPren() {
    const emailInput = document.getElementById('u-email');
    const email = emailInput.value.trim();

    if (selectedDays.length === 0) return alert("Seleziona almeno un giorno!");
    if (!email) return alert("Inserisci la mail per ricevere la conferma!");

    try {
        const res = await fetch('/api/prenota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ npass: userPass, giorni: selectedDays, email: email })
        });

        if (res.ok) {
            // Mostra riepilogo a schermo come da richiesta
            show('view-success');
            const dettagli = document.getElementById('summary-details');
            dettagli.innerHTML = `
                <strong>Dettagli Conferma:</strong><br>
                👤 Pass: ${userPass}<br>
                📧 Email: ${email}<br>
                📅 Date: ${selectedDays.sort().map(d => new Date(d).toLocaleDateString('it-IT')).join(', ')}
            `;
        } else {
            alert("Errore durante l'invio della prenotazione.");
        }
    } catch (e) {
        alert("Errore di connessione al server.");
    }
}

// --- LOGICA "LE MIE PRENOTAZIONI" ---
async function mostraMie() {
    show('view-my-list');
    const container = document.getElementById('my-list-content');
    container.innerHTML = "<p style='text-align:center;'>Caricamento in corso...</p>";

    try {
        const res = await fetch(`/api/mie-prenotazioni/${userPass}`);
        const dati = await res.json();

        if (dati.length === 0) {
            container.innerHTML = "<p style='text-align:center;'>Non hai prenotazioni attive.</p>";
            return;
        }

        // Ripristino grafica con icone e stato
        container.innerHTML = dati.map(p => `
            <div style="background:#f1f5f9; padding:12px; margin:8px 0; border-radius:10px; display:flex; justify-content:space-between; align-items:center; border-left: 5px solid #3b82f6;">
                <span style="font-weight:bold;">📅 ${new Date(p.data_prenotata).toLocaleDateString('it-IT')}</span>
                <span style="font-size:12px; color:#3b82f6; background:#dbeafe; padding:4px 8px; border-radius:15px; font-weight:bold;">${p.stato}</span>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = "<p style='color:red;'>Errore nel recupero dei dati.</p>";
    }
}

// --- LOGICA PIANTONE ---
async function cercaPass() {
    const p = document.getElementById('search-p').value.trim().toUpperCase();
    if (!p) return;

    const res = await fetch(`/api/piantone/cerca/${p}`);
    const data = await res.json();

    if (data.trovato) {
        foundRes = data.prenotazione;
        document.getElementById('panel-piantone').classList.remove('hidden');
        document.getElementById('lab-pass').innerText = foundRes.npass;
        document.getElementById('lab-stato').innerText = "STATO: " + foundRes.stato;
        
        // Visualizzazione orari ingresso/uscita sotto i pulsanti
        document.getElementById('time-e').innerText = foundRes.orario_ingresso ? 
            `Entrato il ${new Date(foundRes.orario_ingresso).toLocaleDateString()} alle ${new Date(foundRes.orario_ingresso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : "In attesa di ingresso";
        
        document.getElementById('time-u').innerText = foundRes.orario_uscita ? 
            `Uscito il ${new Date(foundRes.orario_uscita).toLocaleDateString()} alle ${new Date(foundRes.orario_uscita).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : "Non ancora uscito";

        document.getElementById('b-e').disabled = (foundRes.stato !== 'PRENOTATO');
        document.getElementById('b-u').disabled = (foundRes.stato !== 'INGRESSO');
    } else {
        alert("Nessuna prenotazione trovata per oggi con questo Pass.");
    }
}

async function mossa(tipo) {
    if (!foundRes) return;
    try {
        await fetch('/api/piantone/azione', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: foundRes.id, azione: tipo, npass: foundRes.npass })
        });
        cercaPass();
        aggiornaMonitor();
    } catch (e) {
        alert("Errore nell'operazione.");
    }
}

async function aggiornaMonitor() {
    try {
        const res = await fetch('/api/riepilogo-totale');
        const dati = await res.json();
        const tab = document.getElementById('tab-monitor');
        
        // Mostra solo chi è attualmente dentro
        const dentro = dati.filter(x => x.stato === 'INGRESSO');
        
        tab.innerHTML = `<tr><th>PASS</th><th>INFO</th><th>STATO</th></tr>`;
        tab.innerHTML += dentro.map(x => `
            <tr>
                <td><strong>${x.npass}</strong></td>
                <td>Entrato: ${new Date(x.orario_ingresso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                <td><span style="color:green; font-weight:bold;">DENTRO</span></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Errore monitoraggio:", e);
    }
}

async function mostraRiepilogo() {
    show('view-summary');
    const tab = document.getElementById('tab-summary');
    tab.innerHTML = "<tr><td colspan='4'>Caricamento riepilogo...</td></tr>";

    try {
        const res = await fetch('/api/riepilogo-totale');
        const dati = await res.json();
        
        tab.innerHTML = `<tr><th>DATA</th><th>PASS</th><th>STATO</th><th>ORARI (I/U)</th></tr>`;
        tab.innerHTML += dati.map(x => `
            <tr>
                <td>${new Date(x.data_prenotata).toLocaleDateString()}</td>
                <td>${x.npass}</td>
                <td>${x.stato}</td>
                <td>
                    ${x.orario_ingresso ? new Date(x.orario_ingresso).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'}) : '--'} / 
                    ${x.orario_uscita ? new Date(x.orario_uscita).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'}) : '--'}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tab.innerHTML = "<tr><td colspan='4'>Errore nel caricamento.</td></tr>";
    }
}