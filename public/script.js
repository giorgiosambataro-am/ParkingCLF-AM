let userPass = ""; 
let selectedDays = []; 
let currentPrenotazioni = [];

// Funzione utilità per navigare tra le schermate
function show(id) {
    document.querySelectorAll('.card > div').forEach(d => d.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// --- LOGICA DI ACCESSO ---
async function doLogin() {
    userPass = document.getElementById('in-npass').value.trim().toUpperCase();
    if (!userPass) return alert("Inserisci un PASS");

    const res = await fetch('/api/valida-pass', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({npass: userPass}) 
    });
    
    const data = await res.json();
    
    if(data.valid) {
        if(data.ruolo === 'piantone') { 
            show('view-piantone'); 
            aggiornaVeicoli(); 
        }
        else if(data.ruolo === 'admin') { 
            show('view-admin'); 
            mostraAdmin(); 
        }
        else { 
            show('view-user'); 
            buildCal(); 
        }
    } else {
        alert("Pass errato o non registrato.");
    }
}

// --- LOGICA UTENTE ---
function buildCal() {
    const grid = document.getElementById('cal-grid'); 
    grid.innerHTML = ""; 
    selectedDays = [];
    
    let d = new Date();
    // Genera i prossimi 30 giorni
    for(let i=0; i<30; i++) {
        const iso = d.toISOString().split('T')[0];
        const slot = document.createElement('div'); 
        slot.className = "day-slot";
        
        // Formatta la data come DD/MM
        slot.innerText = d.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'});
        
        // Gestione della selezione
        slot.onclick = () => { 
            slot.classList.toggle('selected'); 
            if(slot.classList.contains('selected')) {
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
    const email = document.getElementById('u-email').value.trim();
    if(selectedDays.length === 0) return alert("Seleziona almeno un giorno dal calendario!");
    if(!email) return alert("Inserisci un'email valida per ricevere la conferma.");

    const res = await fetch('/api/prenota', { 
        method: 'POST', 
        headers: {'Content-Type':'application/json'}, 
        body: JSON.stringify({npass: userPass, giorni: selectedDays, email: email}) 
    });
    
    if(res.ok) {
        show('view-success');
    } else {
        alert("Errore durante la prenotazione.");
    }
}

async function mostraMie() {
    show('view-my-list');
    const res = await fetch(`/api/mie-prenotazioni/${userPass}`);
    const dati = await res.json();
    
    const content = document.getElementById('my-list-content');
    if (dati.length > 0) {
        content.innerHTML = dati.map(p => `
            <div style="background:var(--light); padding:12px; margin:8px 0; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
                <span>📅 <b>${new Date(p.data_prenotata).toLocaleDateString('it-IT')}</b></span>
                <span class="badge ${p.stato === 'PRENOTATO' ? 'badge-orange' : 'badge-green'}">${p.stato}</span>
            </div>
        `).join('');
    } else {
        content.innerHTML = "<p>Nessuna prenotazione attiva.</p>";
    }
}

async function eliminaTutte() {
    if(confirm("Sei sicuro di voler eliminare TUTTE le tue prenotazioni future?")) {
        await fetch('/api/elimina-prenotazioni', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ npass: userPass })
        });
        alert("Prenotazioni eliminate.");
        show('view-user');
        buildCal(); // Resetta il calendario
    }
}

// --- LOGICA PIANTONE ---
async function cercaPass() {
    const p = document.getElementById('search-p').value.trim().toUpperCase();
    if(!p) return;

    const res = await fetch(`/api/piantone/cerca/${p}`);
    const data = await res.json();

    if(data.trovato) {
        currentPrenotazioni = data.prenotazioni;
        const primaPrenotazione = currentPrenotazioni[0]; 
        
        document.getElementById('panel-piantone').classList.remove('hidden');
        document.getElementById('lab-pass').innerText = "PASS: " + primaPrenotazione.npass;
        document.getElementById('lab-stato').innerText = "Stato attuale: " + primaPrenotazione.stato;
        
        // Funzione per formattare la data sotto i pulsanti con l'ora reale
        const formatInfo = (dataIso, oraIso) => {
            if(!oraIso) return ""; // Se non è ancora entrato/uscito, non mostrare nulla
            const d = new Date(dataIso).toLocaleDateString('it-IT');
            const t = new Date(oraIso).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
            return `Registrato il ${d} alle ore ${t}`;
        };

        document.getElementById('info-e').innerText = formatInfo(primaPrenotazione.data_prenotata, primaPrenotazione.orario_ingresso);
        // Per l'uscita usiamo l'ultimo giorno prenotato se è un multi-giorno
        const ultimaPrenotazione = currentPrenotazioni[currentPrenotazioni.length - 1];
        document.getElementById('info-u').innerText = formatInfo(ultimaPrenotazione.data_prenotata, ultimaPrenotazione.orario_uscita);
        
    } else {
        alert("Nessuna prenotazione trovata per oggi per questo pass.");
        document.getElementById('panel-piantone').classList.add('hidden');
    }
}

async function mossa(tipo) {
    if(currentPrenotazioni.length === 0) return;
    
    // Se ENTRATA, aggiorna il primo giorno. Se USCITA, aggiorna l'ultimo giorno
    const idDaAggiornare = (tipo === 'E') ? currentPrenotazioni[0].id : currentPrenotazioni[currentPrenotazioni.length - 1].id;

    const res = await fetch('/api/piantone/azione', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ id: idDaAggiornare, azione: tipo })
    });
    
    if(res.ok) {
        cercaPass(); // Ricarica subito per far apparire l'orario sotto il pulsante
        aggiornaVeicoli(); // Aggiorna la tabella sottostante
    }
}

async function aggiornaVeicoli() {
    const res = await fetch('/api/veicoli-dentro');
    const dati = await res.json();
    
    const tabella = document.getElementById('lista-veicoli');
    if (dati.length === 0) {
        tabella.innerHTML = "<p style='text-align:center; color:#64748b;'>Nessun veicolo attualmente nel parcheggio.</p>";
        return;
    }

    tabella.innerHTML = `
        <table>
            <tr>
                <th>NPASS</th>
                <th>Info Movimento</th>
                <th>Stato</th>
            </tr>
            ${dati.map(x => {
                const dataMov = new Date(x.data_prenotata).toLocaleDateString('it-IT');
                const oraMov = x.orario_ingresso ? new Date(x.orario_ingresso).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}) : '--:--';
                return `
                <tr>
                    <td>
                        <b>${x.npass}</b><br>
                        <span style="font-size:11px; color:#64748b;">Scad: ${dataMov}</span>
                    </td>
                    <td>INGRESSO (${dataMov}) ${oraMov}</td>
                    <td><span class="badge badge-green">In Regola</span></td>
                </tr>
                `;
            }).join('')}
        </table>`;
}

// --- LOGICA ADMIN ---
async function mostraAdmin() {
    const res = await fetch('/api/admin/cruscotto');
    const dati = await res.json();
    
    document.getElementById('tab-admin').innerHTML = `
        <tr>
            <th>Data</th>
            <th>Occupati</th>
            <th>Liberi</th>
        </tr>
        ${dati.map(x => `
            <tr>
                <td>${x.data}</td>
                <td>${x.occupati}</td>
                <td style="color:var(--green); font-weight:bold;">${x.liberi}</td>
            </tr>
        `).join('')}
    `;
}