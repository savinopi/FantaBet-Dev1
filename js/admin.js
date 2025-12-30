/**
 * admin.js - Modulo funzionalità amministratore
 * Gestione utenti, orari giornate, scommesse admin
 */

import { 
    db, 
    getDocs, 
    doc, 
    updateDoc,
    setDoc,
    getDoc,
    writeBatch,
    onSnapshot,
    getUsersCollectionRef,
    getSquadsCollectionRef,
    getScheduleCollectionRef,
    getGiornataBetsCollectionRef
} from './firebase-config.js';
import { messageBox } from './utils.js';
import { 
    getAllUsersForAdmin,
    setAllUsersForAdmin,
    getNextGiornataNumber,
    getCurrentBetsFilter,
    setCurrentBetsFilter,
    getAdminBetsUnsubscribe,
    setAdminBetsUnsubscribe
} from './state.js';
import { addUnsubscribe, getIsUserAdmin } from './auth.js';

// Variabili per la cache degli orari (saranno settate dall'esterno)
let scheduleCache = null;
let activeGiornataCache = null;
let loadAllSchedules;
let loadActiveGiornata;
let getGiornataSchedule;

/**
 * Imposta le dipendenze esterne per il modulo admin
 */
export const setAdminDependencies = (deps) => {
    loadAllSchedules = deps.loadAllSchedules;
    loadActiveGiornata = deps.loadActiveGiornata;
    getGiornataSchedule = deps.getGiornataSchedule;
    if (deps.scheduleCache !== undefined) scheduleCache = deps.scheduleCache;
    if (deps.activeGiornataCache !== undefined) activeGiornataCache = deps.activeGiornataCache;
};

/**
 * Renderizza la lista degli utenti per l'admin
 */
export const renderAdminUsersList = async (users) => {
    const listContainer = document.getElementById('admin-users-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (!users || users.length === 0) {
        listContainer.innerHTML = '<div class="text-center text-gray-500 py-4">Nessun utente registrato.</div>';
        return;
    }

    // Carica le rose disponibili
    const squadsSnapshot = await getDocs(getSquadsCollectionRef());
    const availableSquads = squadsSnapshot.docs.map(doc => doc.data().name).sort();

    users.forEach(user => {
        const row = document.createElement('div');
        row.className = 'bg-gray-900 rounded-lg p-4 mb-3 border border-gray-700';
        
        // Crea le opzioni per il select delle rose
        let squadOptions = '<option value="">Nessuna rosa</option>';
        availableSquads.forEach(squadName => {
            const selected = user.fantaSquad === squadName ? 'selected' : '';
            squadOptions += `<option value="${squadName}" ${selected}>${squadName}</option>`;
        });
        
        row.innerHTML = `
            <div class="flex flex-col space-y-3">
                <!-- Header con email -->
                <div class="flex items-center justify-between border-b border-gray-700 pb-2">
                    <div class="font-medium text-white">${user.displayName || user.email || user.id}</div>
                    <div class="text-xs text-gray-500">${user.email || ''}</div>
                </div>
                
                <!-- Grid informazioni utente -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <!-- Rosa Fantacalcio -->
                    <div class="flex flex-col">
                        <label class="text-xs text-gray-400 mb-1">Rosa Fantacalcio</label>
                        <select 
                            id="squad-${user.id}" 
                            class="bg-gray-800 text-sm p-2 rounded border border-gray-600 text-white">
                            ${squadOptions}
                        </select>
                    </div>
                    
                    <!-- Crediti -->
                    <div class="flex flex-col">
                        <label class="text-xs text-gray-400 mb-1">Crediti</label>
                        <input 
                            type="number" 
                            id="credits-${user.id}" 
                            value="${user.credits || 0}" 
                            class="bg-gray-800 text-sm p-2 rounded border border-gray-600 text-white" />
                    </div>
                    
                    <!-- Admin -->
                    <div class="flex flex-col justify-center">
                        <label class="text-xs text-gray-400 mb-1">Ruolo</label>
                        <label class="flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="isAdmin-${user.id}" 
                                ${user.isAdmin ? 'checked' : ''}
                                class="mr-2 w-4 h-4">
                            <span class="text-sm ${user.isAdmin ? 'text-yellow-400 font-bold' : 'text-gray-300'}">
                                ${user.isAdmin ? 'Admin' : 'Utente'}
                            </span>
                        </label>
                    </div>
                    
                    <!-- Pulsante Salva -->
                    <div class="flex items-end">
                        <button 
                            onclick="updateUserPermissionsAndCredits('${user.id}')" 
                            class="btn-primary w-full text-sm py-2">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                            Salva
                        </button>
                    </div>
                </div>
            </div>
        `;
        listContainer.appendChild(row);
    });
};

/**
 * Carica gli utenti per l'admin
 */
export const loadUsersForAdmin = async () => {
    const isUserAdmin = getIsUserAdmin();
    
    if (!isUserAdmin) {
        messageBox('Solo gli admin possono accedere a questa sezione.');
        return;
    }
    
    try {
        const usersSnapshot = await getDocs(getUsersCollectionRef());
        const allUsersForAdmin = usersSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));
        
        setAllUsersForAdmin(allUsersForAdmin);
        await renderAdminUsersList(allUsersForAdmin);
    } catch (error) {
        console.error('Errore caricamento utenti:', error);
        messageBox('Errore nel caricamento degli utenti: ' + error.message);
    }
};

/**
 * Aggiorna permessi e crediti di un utente
 */
export const updateUserPermissionsAndCredits = async (uid) => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) return;
    
    const isAdmin = document.getElementById(`isAdmin-${uid}`).checked;
    const credits = parseInt(document.getElementById(`credits-${uid}`).value, 10);
    const fantaSquad = document.getElementById(`squad-${uid}`).value || null;

    if (isNaN(credits)) {
        messageBox("I crediti devono essere un numero.");
        return;
    }

    try {
        await updateDoc(doc(getUsersCollectionRef(), uid), { 
            isAdmin: isAdmin,
            credits: credits,
            fantaSquad: fantaSquad
        });
        messageBox("Dati utente aggiornati con successo!");
    } catch (error) {
        console.error("Errore aggiornamento utente:", error);
        messageBox("Errore durante l'aggiornamento: " + error.message);
    }
};

/**
 * Carica e renderizza gli orari delle giornate per l'admin
 */
export const loadSchedulesForAdmin = async () => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) return;
    
    try {
        // Ricarica la cache
        scheduleCache = null;
        activeGiornataCache = null;
        await loadAllSchedules();
        const activeGiornata = await loadActiveGiornata(true);
        
        const tbody = document.getElementById('schedules-table-body');
        tbody.innerHTML = '';
        
        // Genera righe per tutte le 36 giornate del fantacalcio (Serie A giornate 3-38)
        for (let g = 1; g <= 36; g++) {
            const schedule = await getGiornataSchedule(g);
            const isActive = schedule.isActive === true;
            const deadline = new Date(`${schedule.date}T${schedule.time}:00`);
            const now = new Date();
            const isPast = now >= deadline;
            const isUpcoming = !isPast && (deadline - now) < 7 * 24 * 60 * 60 * 1000; // Prossimi 7 giorni
            
            const row = document.createElement('tr');
            row.className = isPast ? 'bg-gray-800/50 opacity-60' : isUpcoming ? 'bg-yellow-900/20' : isActive ? 'bg-green-900/30' : '';
            
            // Calcola la giornata Serie A corrispondente
            const serieAGiornata = g + 2;
            
            // Calcola countdown
            let countdownText = '';
            if (isPast) {
                countdownText = '<span class="text-gray-500 text-xs">Passata</span>';
            } else {
                const diff = deadline - now;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                if (days > 0) {
                    countdownText = `<span class="text-blue-400 text-xs">${days}g ${hours}h</span>`;
                } else {
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    countdownText = `<span class="text-yellow-400 font-bold text-xs">${hours}h ${minutes}m</span>`;
                }
            }
            
            row.innerHTML = `
                <td class="px-3 py-2 font-bold ${isUpcoming ? 'text-yellow-400' : isActive ? 'text-green-400' : ''}">${g}</td>
                <td class="px-3 py-2 text-gray-400 text-xs">${serieAGiornata}</td>
                <td class="px-3 py-2">
                    <input type="date" 
                           id="schedule-date-${g}" 
                           value="${schedule.date}" 
                           class="bg-gray-800 text-white px-2 py-1 rounded text-sm w-full"
                           ${isPast ? 'disabled' : ''}>
                </td>
                <td class="px-3 py-2">
                    <input type="time" 
                           id="schedule-time-${g}" 
                           value="${schedule.time}" 
                           class="bg-gray-800 text-white px-2 py-1 rounded text-sm w-full"
                           ${isPast ? 'disabled' : ''}>
                </td>
                <td class="px-3 py-2 text-center">
                    <input type="checkbox" 
                           id="schedule-confirmed-${g}" 
                           ${schedule.confirmed ? 'checked' : ''}
                           class="w-4 h-4"
                           ${isPast ? 'disabled' : ''}>
                </td>
                <td class="px-3 py-2 text-center">
                    <input type="radio" 
                           name="active-giornata" 
                           id="schedule-active-${g}" 
                           value="${g}"
                           ${isActive ? 'checked' : ''}
                           class="w-4 h-4 cursor-pointer"
                           ${isPast ? 'disabled' : ''}>
                </td>
                <td class="px-3 py-2 text-center">
                    ${countdownText}
                </td>
            `;
            
            tbody.appendChild(row);
        }
        
        // Aggiungi event listener ai radio button per aggiornare lo stile della riga
        document.querySelectorAll('input[name="active-giornata"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                // Rimuovi la classe green-900/30 da tutte le righe
                document.querySelectorAll('#schedules-table-body tr').forEach(tr => {
                    tr.classList.remove('bg-green-900/30');
                });
                
                // Aggiungi la classe green-900/30 alla riga selezionata
                if (e.target.checked) {
                    const row = e.target.closest('tr');
                    if (row) {
                        row.classList.add('bg-green-900/30');
                    }
                }
            });
        });
        
        messageBox("Orari caricati correttamente.");
    } catch (error) {
        console.error('Errore caricamento schedules:', error);
        messageBox("Errore nel caricamento degli orari: " + error.message);
    }
};

/**
 * Salva tutti gli orari modificati e la giornata attiva
 */
export const saveAllSchedules = async () => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) return;
    
    if (!confirm("Salvare tutte le modifiche agli orari delle giornate?")) {
        return;
    }
    
    try {
        const batch = writeBatch(db);
        
        // Ottieni quale giornata è selezionata come attiva (radio button)
        const activeRadio = document.querySelector('input[name="active-giornata"]:checked');
        const selectedActiveGiornata = activeRadio ? parseInt(activeRadio.value) : null;
        
        console.log('[DEBUG saveAllSchedules] Giornata attiva selezionata:', selectedActiveGiornata);
        
        // PRIMA: Resetta isActive su TUTTE le giornate
        for (let g = 1; g <= 36; g++) {
            const isActive = (selectedActiveGiornata === g);
            const docRef = doc(getScheduleCollectionRef(), `giornata_${g}`);
            
            batch.set(docRef, { isActive: isActive }, { merge: true });
            
            if (isActive) {
                console.log('[DEBUG saveAllSchedules] Impostando giornata', g, 'come ATTIVA');
            }
        }
        
        // POI: Salva i dati completi delle giornate non passate
        for (let g = 1; g <= 36; g++) {
            const dateInput = document.getElementById(`schedule-date-${g}`);
            const timeInput = document.getElementById(`schedule-time-${g}`);
            const confirmedInput = document.getElementById(`schedule-confirmed-${g}`);
            
            if (!dateInput || !timeInput || !confirmedInput) continue;
            if (dateInput.disabled) continue; // Salta le giornate passate
            
            const scheduleData = {
                giornata: g.toString(),
                date: dateInput.value,
                time: timeInput.value,
                confirmed: confirmedInput.checked
            };
            
            const docRef = doc(getScheduleCollectionRef(), `giornata_${g}`);
            batch.set(docRef, scheduleData, { merge: true });
        }
        
        await batch.commit();
        
        // Ricarica la cache
        scheduleCache = null;
        activeGiornataCache = null;
        await loadAllSchedules();
        await loadActiveGiornata(true);
        
        messageBox("✅ Tutti gli orari e la giornata attiva sono stati salvati con successo!");
        
        // Ricarica la vista
        await loadSchedulesForAdmin();
    } catch (error) {
        console.error('Errore salvataggio schedules:', error);
        messageBox("Errore nel salvataggio degli orari: " + error.message);
    }
};

/**
 * Renderizza il filtro scommesse admin
 */
export const renderAdminBetsFilter = async (filter) => {
    setCurrentBetsFilter(filter);
    
    // Aggiorna pulsanti attivi
    document.getElementById('filter-all').className = filter === 'all' ? 'btn-primary' : 'btn-secondary';
    document.getElementById('filter-pending').className = filter === 'pending' ? 'btn-primary' : 'btn-secondary';
    document.getElementById('filter-settled').className = filter === 'settled' ? 'btn-primary' : 'btn-secondary';
    
    // Ricarica la lista
    const snapshot = await getDocs(getGiornataBetsCollectionRef());
    const allBets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const usersSnapshot = await getDocs(getUsersCollectionRef());
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    renderAdminBetsList(allBets, allUsers, filter);
};

/**
 * Renderizza la lista delle scommesse per l'admin
 */
export const renderAdminBetsList = (bets, users, filter = 'pending') => {
    const listContainer = document.getElementById('admin-bets-list');
    if (!listContainer) {
        console.error('Container admin-bets-list non trovato!');
        return;
    }
    listContainer.innerHTML = '';

    if (!bets || bets.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500">Nessuna scommessa trovata.</p>';
        return;
    }

    // Filtra le scommesse in base al filtro selezionato
    let filteredBets = bets;
    if (filter === 'pending') {
        filteredBets = bets.filter(b => !b.settled);
    } else if (filter === 'settled') {
        filteredBets = bets.filter(b => b.settled);
    }

    if (filteredBets.length === 0) {
        listContainer.innerHTML = `<p class="text-gray-500">Nessuna scommessa ${filter === 'pending' ? 'da liquidare' : filter === 'settled' ? 'liquidata' : ''} trovata.</p>`;
        return;
    }

    // Raggruppa le scommesse per giornata
    const betsByGiornata = filteredBets.reduce((acc, bet) => {
        const g = bet.giornata || 'Sconosciuta';
        if (!acc[g]) acc[g] = [];
        acc[g].push(bet);
        return acc;
    }, {});

    console.log('Scommesse raggruppate per giornata:', betsByGiornata);

    const userMap = (users || []).reduce((m, u) => { 
        m[u.uid || u.id] = u.displayName || u.email || u.id; 
        return m; 
    }, {});
    
    console.log('Mappa utenti:', userMap);

    const sortedGiornate = Object.keys(betsByGiornata).sort((a,b) => parseInt(a,10) - parseInt(b,10));

    console.log('Rendering giornate:', sortedGiornate);

    sortedGiornate.forEach(g => {
        const header = document.createElement('h4');
        header.className = 'text-lg font-bold text-yellow-500 mt-4 mb-2';
        header.textContent = `Giornata ${g}`;
        listContainer.appendChild(header);

        const betsInG = betsByGiornata[g];
        
        console.log(`Rendering ${betsInG.length} scommesse per Giornata ${g}:`, betsInG);
        
        betsInG.forEach(bet => {
            const userName = userMap[bet.userId] || bet.userId;
            console.log('Rendering scommessa:', {
                giornata: g,
                utente: userName,
                stake: bet.stake,
                predictions: bet.predictions?.length,
                settled: bet.settled
            });
            
            const userCard = document.createElement('div');
            userCard.className = `card p-4 mb-3 ${bet.settled ? (bet.isWinning ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500') : 'border-l-4 border-yellow-500'}`;
            
            let betHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h5 class="font-semibold text-green-300 text-lg">${userName}</h5>
                        <div class="text-sm text-gray-400">
                            Puntata: <span class="font-bold text-blue-400">${bet.stake || 0}</span> crediti | 
                            Quota Totale: <span class="font-bold text-blue-400">${bet.quotaTotale ? bet.quotaTotale.toFixed(2) : '-'}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        ${bet.settled ? `
                            <div class="text-sm">
                                <div class="${bet.isWinning ? 'text-green-400' : 'text-red-400'} font-bold text-lg">
                                    ${bet.isWinning ? '✓ VINCENTE' : '✗ PERDENTE'}
                                </div>
                                <div class="text-gray-400">
                                    Vincita: <span class="${bet.isWinning ? 'text-green-400' : 'text-red-400'} font-bold">${bet.winnings ? bet.winnings.toFixed(2) : '0.00'}</span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    Liquidata il: ${bet.settledAt ? new Date(bet.settledAt).toLocaleString('it-IT') : '-'}
                                </div>
                            </div>
                        ` : `
                            <div class="text-yellow-400 font-bold">DA LIQUIDARE</div>
                        `}
                    </div>
                </div>
            `;

            // Mostra i pronostici
            if (bet.predictions && bet.predictions.length > 0) {
                betHTML += '<div class="space-y-2">';
                bet.predictions.forEach(pred => {
                    let resultClass = '';
                    let resultIcon = '';
                    
                    if (bet.settled && bet.detailedResults) {
                        const matchResult = bet.detailedResults.find(r => 
                            r.match === `${pred.homeTeam} vs ${pred.awayTeam}`
                        );
                        if (matchResult) {
                            resultClass = matchResult.correct ? 'bg-green-900/30 border-green-600' : 'bg-red-900/30 border-red-600';
                            resultIcon = matchResult.correct ? 
                                `<span class="text-green-400 font-bold">✓</span> Risultato: ${matchResult.actual}` : 
                                `<span class="text-red-400 font-bold">✗</span> Risultato: ${matchResult.actual}`;
                        }
                    }
                    
                    betHTML += `
                        <div class="p-2 bg-gray-800 rounded-lg border ${resultClass || 'border-gray-700'}">
                            <div class="flex justify-between items-center">
                                <div class="flex-1">
                                    <div class="font-semibold">${pred.homeTeam || '-'} vs ${pred.awayTeam || '-'}</div>
                                    <div class="text-sm text-gray-400">
                                        Pronostico: <span class="font-bold text-blue-400">${pred.prediction}</span> 
                                        (Quota: ${pred.odds ? parseFloat(pred.odds).toFixed(2) : '-'})
                                    </div>
                                </div>
                                ${resultIcon ? `<div class="text-sm ml-4">${resultIcon}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                betHTML += '</div>';
            }

            userCard.innerHTML = betHTML;
            listContainer.appendChild(userCard);
        });
    });
};

/**
 * Aggiorna la scommessa di un utente (admin)
 */
export const updateUserBet = async (betId) => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) return;
    
    const select = document.getElementById(`bet-edit-${betId}`);
    if (!select) return;
    const newPrediction = select.value;
    try {
        const betDocRef = doc(getGiornataBetsCollectionRef(), betId);
        await updateDoc(betDocRef, { prediction: newPrediction });
        messageBox("Pronostico aggiornato con successo.");
    } catch (error) {
        console.error("Errore aggiornamento scommessa:", error);
        messageBox("Errore durante l'aggiornamento della scommessa.");
    }
};

/**
 * Espone le funzioni admin a window per l'uso nell'HTML
 */
export const setupGlobalAdminFunctions = () => {
    window.loadUsersForAdmin = loadUsersForAdmin;
    window.updateUserPermissionsAndCredits = updateUserPermissionsAndCredits;
    window.loadSchedulesForAdmin = loadSchedulesForAdmin;
    window.saveAllSchedules = saveAllSchedules;
    window.renderAdminBetsFilter = renderAdminBetsFilter;
    window.updateUserBet = updateUserBet;
};
