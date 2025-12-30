/**
 * player-stats.js - Modulo per gestione statistiche calciatori
 * Visualizzazione, filtraggio, ordinamento statistiche
 */

import { 
    db,
    getDocs,
    deleteDoc,
    doc,
    getPlayerStatsCollectionRef,
    getPlayersCollectionRef
} from './firebase-config.js';
import { messageBox, showProgressBar, hideProgressBar, updateProgress, getTeamLogo } from './utils.js';
import { getIsUserAdmin } from './auth.js';
import { getAllResults } from './state.js';

// Variabili per l'ordinamento
let currentSortColumn = 'fm';
let currentSortDirection = 'desc';

// Dati correnti
let currentPlayerStats = [];
let currentFilteredStats = [];
let currentSquadsData = new Map();

// Dipendenze esterne
let renderStatistics = null;
let renderStandingsTrend = null;

/**
 * Imposta le dipendenze esterne
 */
export const setPlayerStatsDependencies = (deps) => {
    if (deps.renderStatistics) renderStatistics = deps.renderStatistics;
    if (deps.renderStandingsTrend) renderStandingsTrend = deps.renderStandingsTrend;
};

// ==================== CANCELLAZIONE DATI ====================

/**
 * Cancella tutte le statistiche dei calciatori
 */
export const clearPlayerStats = async () => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) return;
    
    if (!confirm('Sei sicuro di voler cancellare TUTTE le statistiche dei calciatori? Questa azione è irreversibile.')) {
        return;
    }
    
    showProgressBar('Cancellazione Statistiche');
    
    try {
        const statsSnapshot = await getDocs(getPlayerStatsCollectionRef());
        const totalDocs = statsSnapshot.docs.length;
        let deletedCount = 0;
        
        updateProgress(0, 'Cancellazione statistiche in corso...');
        
        for (const docSnapshot of statsSnapshot.docs) {
            await deleteDoc(doc(getPlayerStatsCollectionRef(), docSnapshot.id));
            deletedCount++;
            
            const progress = (deletedCount / totalDocs) * 100;
            updateProgress(progress, `Cancellazione statistiche...`, deletedCount, totalDocs);
        }
        
        hideProgressBar();
        messageBox(`Cancellate ${deletedCount} statistiche calciatori.`);
        console.log(`Cancellate ${deletedCount} statistiche`);
        
        // Pulisci il container visualizzazione
        const summaryContainer = document.getElementById('stats-summary-container');
        if (summaryContainer) {
            summaryContainer.innerHTML = '';
        }
        const dataContainer = document.getElementById('stats-data-container');
        if (dataContainer) {
            dataContainer.innerHTML = '<p class="text-gray-500 text-sm">Nessuna statistica caricata.</p>';
        }
    } catch (error) {
        console.error("Errore cancellazione statistiche:", error);
        hideProgressBar();
        messageBox(`Errore durante la cancellazione: ${error.message}`);
    }
};

/**
 * Cancella tutte le rose (calciatori e aggregati)
 */
export const clearSquadsData = async () => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) return;
    
    if (!confirm('Sei sicuro di voler cancellare TUTTE le rose squadre (calciatori e aggregati)? Questa azione è irreversibile.')) {
        return;
    }
    
    showProgressBar('Cancellazione Rose');
    
    try {
        updateProgress(0, 'Cancellazione calciatori...');
        
        // Cancella tutti i calciatori
        const playersSnapshot = await getDocs(getPlayersCollectionRef());
        const playerDocs = playersSnapshot.docs.length;
        let deletedPlayers = 0;
        
        for (const docSnapshot of playersSnapshot.docs) {
            await deleteDoc(doc(getPlayersCollectionRef(), docSnapshot.id));
            deletedPlayers++;
            
            const progress = (deletedPlayers / playerDocs) * 50;
            updateProgress(progress, `Cancellazione calciatori...`, deletedPlayers, playerDocs);
        }
        
        // Import dinamico per getSquadsCollectionRef
        const { getSquadsCollectionRef } = await import('./firebase-config.js');
        
        updateProgress(50, 'Cancellazione info squadre...');
        
        // Cancella le informazioni aggregate squadre
        const squadsSnapshot = await getDocs(getSquadsCollectionRef());
        const squadDocs = squadsSnapshot.docs.length;
        let deletedSquads = 0;
        
        for (const docSnapshot of squadsSnapshot.docs) {
            await deleteDoc(doc(getSquadsCollectionRef(), docSnapshot.id));
            deletedSquads++;
            
            const progress = 50 + (deletedSquads / squadDocs) * 50;
            updateProgress(progress, `Cancellazione info squadre...`, deletedSquads, squadDocs);
        }
        
        hideProgressBar();
        messageBox(`Cancellate ${deletedPlayers} calciatori e ${deletedSquads} squadre.`);
        console.log(`Rose cancellate: ${deletedPlayers} calciatori, ${deletedSquads} squadre`);
        
        // Pulisci il container visualizzazione
        const container = document.getElementById('squads-data-container');
        if (container) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Nessun dato rose caricato.</p>';
        }
    } catch (error) {
        console.error("Errore cancellazione rose:", error);
        hideProgressBar();
        messageBox(`Errore durante la cancellazione: ${error.message}`);
    }
};

// ==================== VISUALIZZAZIONE STATISTICHE ====================

/**
 * Carica le statistiche pubbliche dei calciatori
 */
export const loadPlayerStats = async () => {
    try {
        const statsCollection = getPlayerStatsCollectionRef();
        const snapshot = await getDocs(statsCollection);
        
        if (snapshot.empty) {
            document.getElementById('player-stats-view-container').innerHTML = '<p class="text-center text-gray-500 py-8">Nessuna statistica caricata. Contatta l\'admin per il caricamento.</p>';
            return;
        }
        
        // Carica tutte le statistiche (inclusi svincolati)
        const allStats = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allStats.push(data);
        });
        
        // Popola i filtri
        const squadFilter = document.getElementById('stats-squad-filter');
        const uniqueSquads = [...new Set(allStats.map(s => s.fantaSquad))].sort();
        squadFilter.innerHTML = '<option value="all">Tutte le rose</option>';
        uniqueSquads.forEach(squad => {
            squadFilter.innerHTML += `<option value="${squad}">${squad}</option>`;
        });
        
        // Salva globalmente per i filtri
        currentPlayerStats = allStats;
        currentFilteredStats = allStats;
        window.currentPlayerStats = allStats;
        window.currentFilteredStats = allStats;
        
        // Mostra tutte le statistiche con ordinamento default
        sortPlayerStats(currentSortColumn);
        
    } catch (error) {
        console.error('Errore nel caricamento delle statistiche:', error);
        messageBox('Errore nel caricamento delle statistiche.');
    }
};

/**
 * Renderizza la vista delle statistiche calciatori
 */
const renderPlayerStatsView = (stats) => {
    const container = document.getElementById('player-stats-view-container');
    if (!container) return;
    
    if (stats.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">Nessun giocatore trovato con i filtri selezionati.</p>';
        return;
    }
    
    const getSortIcon = (column) => {
        if (currentSortColumn !== column) {
            return '<svg class="w-3 h-3 inline ml-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z"></path></svg>';
        }
        if (currentSortDirection === 'asc') {
            return '<svg class="w-3 h-3 inline ml-1 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>';
        } else {
            return '<svg class="w-3 h-3 inline ml-1 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>';
        }
    };
    
    const roleColors = {
        'P': 'text-yellow-400',
        'D': 'text-blue-400',
        'C': 'text-green-400',
        'A': 'text-red-400'
    };
    
    // Visualizzazione in tabella
    let html = '<div class="overflow-x-auto">';
    html += '<table class="min-w-full bg-gray-800 rounded-lg overflow-hidden text-sm">';
    html += `
        <thead>
            <tr class="bg-gray-700 text-gray-300 text-xs uppercase">
                <th onclick="sortPlayerStats('playerName')" class="px-3 py-2 text-left sticky left-0 bg-gray-700 z-10 cursor-pointer hover:bg-gray-600 transition-colors">
                    Calciatore ${getSortIcon('playerName')}
                </th>
                <th onclick="sortPlayerStats('fantaSquad')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    Rosa ${getSortIcon('fantaSquad')}
                </th>
                <th onclick="sortPlayerStats('role')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    Ruolo ${getSortIcon('role')}
                </th>
                <th onclick="sortPlayerStats('serieATeam')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    Squadra ${getSortIcon('serieATeam')}
                </th>
                <th onclick="sortPlayerStats('pv')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    PV ${getSortIcon('pv')}
                </th>
                <th onclick="sortPlayerStats('mv')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    MV ${getSortIcon('mv')}
                </th>
                <th onclick="sortPlayerStats('fm')" class="px-3 py-2 text-center bg-blue-900/30 cursor-pointer hover:bg-blue-800/40 transition-colors">
                    FM ${getSortIcon('fm')}
                </th>
                <th onclick="sortPlayerStats('gf')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    GF ${getSortIcon('gf')}
                </th>
                <th onclick="sortPlayerStats('gs')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    GS ${getSortIcon('gs')}
                </th>
                <th onclick="sortPlayerStats('rp')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    RP ${getSortIcon('rp')}
                </th>
                <th onclick="sortPlayerStats('rc')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    RC ${getSortIcon('rc')}
                </th>
                <th onclick="sortPlayerStats('rPlus')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    R+ ${getSortIcon('rPlus')}
                </th>
                <th onclick="sortPlayerStats('rMinus')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    R- ${getSortIcon('rMinus')}
                </th>
                <th onclick="sortPlayerStats('ass')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    ASS ${getSortIcon('ass')}
                </th>
                <th onclick="sortPlayerStats('amm')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    AMM ${getSortIcon('amm')}
                </th>
                <th onclick="sortPlayerStats('esp')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    ESP ${getSortIcon('esp')}
                </th>
                <th onclick="sortPlayerStats('au')" class="px-3 py-2 text-center cursor-pointer hover:bg-gray-600 transition-colors">
                    AU ${getSortIcon('au')}
                </th>
            </tr>
        </thead>
        <tbody>
    `;
    
    stats.forEach((stat, index) => {
        const bgClass = index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750';
        const roleColor = roleColors[stat.role] || 'text-white';
        
        html += `
            <tr class="${bgClass} hover:bg-gray-700 transition-colors">
                <td class="px-3 py-2 font-medium sticky left-0 ${bgClass} z-10">${stat.playerName}</td>
                <td class="px-3 py-2 text-center text-xs text-purple-400">${stat.fantaSquad}</td>
                <td class="px-3 py-2 text-center font-bold ${roleColor}">${stat.role}</td>
                <td class="px-3 py-2 text-center text-xs text-gray-400">${stat.serieATeam}</td>
                <td class="px-3 py-2 text-center">${stat.pv}</td>
                <td class="px-3 py-2 text-center">${stat.mv.toFixed(2)}</td>
                <td class="px-3 py-2 text-center font-bold text-blue-300 bg-blue-900/20">${stat.fm.toFixed(2)}</td>
                <td class="px-3 py-2 text-center ${stat.gf > 0 ? 'text-green-400 font-bold' : ''}">${stat.gf || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.gs > 0 ? 'text-red-400' : ''}">${stat.gs || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.rp > 0 ? 'text-green-400' : ''}">${stat.rp || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.rc > 0 ? 'text-red-400' : ''}">${stat.rc || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.rPlus > 0 ? 'text-green-400' : ''}">${stat.rPlus || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.rMinus > 0 ? 'text-red-400' : ''}">${stat.rMinus || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.ass > 0 ? 'text-blue-400 font-bold' : ''}">${stat.ass || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.amm > 0 ? 'text-yellow-400' : ''}">${stat.amm || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.esp > 0 ? 'text-red-500 font-bold' : ''}">${stat.esp || '-'}</td>
                <td class="px-3 py-2 text-center ${stat.au > 0 ? 'text-red-400' : ''}">${stat.au || '-'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
};

/**
 * Ordina le statistiche dei calciatori
 */
export const sortPlayerStats = (column) => {
    if (!currentFilteredStats || currentFilteredStats.length === 0) return;
    
    // Se clicco sulla stessa colonna, inverto la direzione
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Nuova colonna: default decrescente per numeri, crescente per testo
        currentSortColumn = column;
        const textColumns = ['playerName', 'fantaSquad', 'role', 'serieATeam'];
        currentSortDirection = textColumns.includes(column) ? 'asc' : 'desc';
    }
    
    // Ordina i dati
    const sorted = [...currentFilteredStats].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        // Gestione valori nulli/undefined
        if (valA === null || valA === undefined) valA = 0;
        if (valB === null || valB === undefined) valB = 0;
        
        // Confronto
        if (typeof valA === 'string' && typeof valB === 'string') {
            return currentSortDirection === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
        } else {
            return currentSortDirection === 'asc' 
                ? valA - valB 
                : valB - valA;
        }
    });
    
    currentFilteredStats = sorted;
    window.currentFilteredStats = sorted;
    renderPlayerStatsView(sorted);
};

/**
 * Filtra le statistiche dei calciatori
 */
export const filterPlayerStats = () => {
    if (!currentPlayerStats || currentPlayerStats.length === 0) return;
    
    const squadFilter = document.getElementById('stats-squad-filter').value;
    const roleFilter = document.getElementById('stats-role-filter').value;
    
    let filtered = [...currentPlayerStats];
    
    // Applica filtri
    if (squadFilter !== 'all') {
        filtered = filtered.filter(s => s.fantaSquad === squadFilter);
    }
    
    if (roleFilter !== 'all') {
        filtered = filtered.filter(s => s.role === roleFilter);
    }
    
    // Salva i dati filtrati e applica l'ordinamento corrente
    currentFilteredStats = filtered;
    window.currentFilteredStats = filtered;
    sortPlayerStats(currentSortColumn);
};

// ==================== LEADERBOARDS (Home Page) ====================

/**
 * Carica le classifiche dei giocatori per la home page
 */
export const loadPlayerLeaderboards = async () => {
    try {
        const playerStatsRef = getPlayerStatsCollectionRef();
        const snapshot = await getDocs(playerStatsRef);
        
        if (snapshot.empty) {
            document.getElementById('player-statistics-container').innerHTML = 
                '<p class="text-sm sm:text-base text-gray-500 text-center py-4 col-span-full">Nessuna statistica disponibile</p>';
            return;
        }
        
        const allStats = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Escludi giocatori svincolati (senza squadra)
            if (data.fantaSquad && data.fantaSquad !== 'SVINCOLATI') {
                allStats.push({
                    ...data,
                    gf: Number(data.gf) || 0,
                    ass: Number(data.ass) || 0,
                    gs: Number(data.gs) || 0,
                    fm: Number(data.fm) || 0,
                    pv: Number(data.pv) || 0
                });
            }
        });
        
        // Calcola il numero totale di giornate di Serie A giocate
        const allResults = getAllResults();
        const lastFantaGiornata = allResults.length > 0 
            ? Math.max(...allResults.map(r => parseInt(r.giornata) || 0))
            : 0;
        const totalGiornate = lastFantaGiornata + 2; // Converti giornata fanta in giornata Serie A
        
        console.log('Ultima giornata Fanta:', lastFantaGiornata, '→ Giornate Serie A:', totalGiornate);
        
        // Top 3 Marcatori (gol segnati)
        const topScorers = allStats
            .filter(p => p.gf > 0)
            .sort((a, b) => b.gf - a.gf)
            .slice(0, 3);
        
        // Top 3 Assistman
        const topAssistmen = allStats
            .filter(p => p.ass > 0)
            .sort((a, b) => b.ass - a.ass)
            .slice(0, 3);
        
        // Top 3 Portieri (meno gol subiti, min 3 presenze)
        const topGoalkeepers = allStats
            .filter(p => p.role === 'P' && p.pv >= 3)
            .sort((a, b) => a.gs - b.gs)
            .slice(0, 3);
        
        // Top 3 FantaMedia (min 3 presenze)
        const topFantaMedia = allStats
            .filter(p => p.pv >= 3 && p.fm > 0)
            .sort((a, b) => b.fm - a.fm)
            .slice(0, 3);
        
        renderPlayerLeaderboards({
            scorers: topScorers,
            assistmen: topAssistmen,
            goalkeepers: topGoalkeepers,
            fantaMedia: topFantaMedia
        }, totalGiornate);
        
    } catch (error) {
        console.error('Errore caricamento statistiche calciatori:', error);
        document.getElementById('player-statistics-container').innerHTML = 
            '<p class="text-sm sm:text-base text-red-500 text-center py-4 col-span-full">Errore nel caricamento delle statistiche</p>';
    }
};

/**
 * Renderizza le classifiche dei giocatori
 */
const renderPlayerLeaderboards = (data, totalGiornate = 0) => {
    const container = document.getElementById('player-statistics-container');
    if (!container) return;
    
    const getRoleBadge = (role) => {
        const badges = {
            'P': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            'D': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            'C': 'bg-green-500/20 text-green-300 border-green-500/30',
            'A': 'bg-red-500/20 text-red-300 border-red-500/30'
        };
        return badges[role] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    };
    
    const renderLeaderboard = (title, players, statKey, statLabel, icon, cardColor, iconColor, statColor) => {
        if (players.length === 0) {
            return `
                <div class="bg-gradient-to-br ${cardColor} border ${iconColor.replace('text-', 'border-')}/50 rounded-lg p-4">
                    <div class="flex items-center mb-3">
                        ${icon}
                        <h4 class="text-sm font-bold ${iconColor} uppercase ml-2">${title}</h4>
                    </div>
                    <p class="text-gray-400 text-sm">Nessun dato disponibile</p>
                </div>
            `;
        }
        
        const playersList = players.map((p, idx) => {
            const logoUrl = getTeamLogo(p.fantaSquad);
            const isFirst = idx === 0;
            const presenze = p.pv || 0;
            const presenzeText = `${presenze}/${totalGiornate}`;
            
            return `
                <div class="flex items-center justify-between ${isFirst ? 'py-3 mb-2 border-b-2' : 'py-2.5'} ${idx < players.length - 1 && !isFirst ? 'border-b border-gray-700/30' : ''} ${isFirst ? 'border-' + iconColor.replace('text-', '') + '/50' : ''}">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            ${logoUrl ? `<img src="${logoUrl}" alt="${p.fantaSquad}" class="${isFirst ? 'w-10 h-10' : 'w-7 h-7'} object-contain flex-shrink-0" onerror="this.style.display='none'">` : ''}
                            <div class="flex-1 min-w-0">
                                <p class="${isFirst ? 'text-base sm:text-lg' : 'text-sm'} font-bold text-white truncate">${p.playerName || 'N/A'}</p>
                                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span class="${isFirst ? 'text-xs' : 'text-xs'} px-2 py-0.5 rounded border ${getRoleBadge(p.role)} font-bold">${p.role}</span>
                                    <span class="${isFirst ? 'text-sm' : 'text-xs'} ${isFirst ? iconColor : 'text-gray-400'} font-semibold truncate">${p.fantaSquad || 'N/A'}</span>
                                    <span class="text-xs text-gray-500">• ${presenzeText}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="text-right ml-3 flex-shrink-0">
                        <p class="${isFirst ? 'text-3xl sm:text-4xl' : 'text-2xl'} font-bold ${statColor}">${statKey === 'fm' ? Number(p[statKey]).toFixed(1) : p[statKey]}</p>
                        <p class="text-xs text-gray-400 uppercase">${statLabel}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="bg-gradient-to-br ${cardColor} border ${iconColor.replace('text-', 'border-')}/50 rounded-lg p-4">
                <div class="flex items-center mb-3">
                    ${icon}
                    <h4 class="text-sm font-bold ${iconColor} uppercase ml-2">${title}</h4>
                </div>
                <div class="space-y-0">
                    ${playersList}
                </div>
            </div>
        `;
    };
    
    const scorersIcon = '<svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path></svg>';
    
    const assistIcon = '<svg class="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>';
    
    const gkIcon = '<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
    
    const fmIcon = '<svg class="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>';
    
    container.innerHTML = `
        ${renderLeaderboard('Top Marcatori', data.scorers, 'gf', 'gol', scorersIcon, 'from-red-900/30 to-red-800/20', 'text-red-400', 'text-red-400')}
        ${renderLeaderboard('Top Assist', data.assistmen, 'ass', 'assist', assistIcon, 'from-blue-900/30 to-blue-800/20', 'text-blue-400', 'text-blue-400')}
        ${renderLeaderboard('Migliori Portieri', data.goalkeepers, 'gs', 'gol sub.', gkIcon, 'from-yellow-900/30 to-yellow-800/20', 'text-yellow-400', 'text-yellow-400')}
        ${renderLeaderboard('Miglior FantaMedia', data.fantaMedia, 'fm', 'FM', fmIcon, 'from-purple-900/30 to-purple-800/20', 'text-purple-400', 'text-purple-400')}
    `;
};

// ==================== VISUALIZZAZIONE ROSE ====================

/**
 * Carica i dati delle rose per la visualizzazione pubblica
 */
export const loadSquadsData = async () => {
    try {
        const playersCollection = getPlayersCollectionRef();
        const snapshot = await getDocs(playersCollection);
        
        if (snapshot.empty) {
            document.getElementById('squads-view-container').innerHTML = '<p class="text-center text-gray-500 py-8">Nessuna rosa caricata. Contatta l\'admin per il caricamento.</p>';
            return;
        }
        
        // Raggruppa i giocatori per squadra
        const squadsMap = new Map();
        snapshot.forEach(doc => {
            const player = doc.data();
            if (!squadsMap.has(player.squadName)) {
                squadsMap.set(player.squadName, []);
            }
            squadsMap.get(player.squadName).push(player);
        });
        
        // Popola il filtro squadre
        const filterSelect = document.getElementById('squad-filter');
        filterSelect.innerHTML = '<option value="all">Tutte le squadre</option>';
        Array.from(squadsMap.keys()).sort().forEach(squadName => {
            filterSelect.innerHTML += `<option value="${squadName}">${squadName}</option>`;
        });
        
        // Salva i dati globalmente per il filtro
        currentSquadsData = squadsMap;
        window.currentSquadsData = squadsMap;
        
        // Mostra tutte le squadre
        renderSquadsView(squadsMap);
        
    } catch (error) {
        console.error('Errore nel caricamento delle rose:', error);
        messageBox('Errore nel caricamento delle rose.');
    }
};

/**
 * Renderizza la vista delle rose
 */
const renderSquadsView = (squadsMap) => {
    const container = document.getElementById('squads-view-container');
    if (!container) return;
    
    let html = '<div class="space-y-6">';
    
    // Ordina le squadre alfabeticamente
    const sortedSquads = Array.from(squadsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [squadName, players] of sortedSquads) {
        const totalCost = players.reduce((sum, p) => sum + p.cost, 0);
        const roles = {
            P: players.filter(p => p.role === 'P'),
            D: players.filter(p => p.role === 'D'),
            C: players.filter(p => p.role === 'C'),
            A: players.filter(p => p.role === 'A')
        };
        
        html += `
            <div class="bg-gray-800 border border-purple-700/50 rounded-lg overflow-hidden">
                <!-- Header squadra -->
                <div class="bg-gradient-to-r from-purple-900 to-purple-800 p-4 border-b border-purple-700">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold text-white">${squadName}</h3>
                        <div class="text-right">
                            <p class="text-sm text-purple-200">Giocatori: <span class="font-bold">${players.length}</span></p>
                            <p class="text-sm text-yellow-300">Crediti: <span class="font-bold">${totalCost}</span></p>
                        </div>
                    </div>
                </div>
                
                <!-- Giocatori per ruolo -->
                <div class="p-4 space-y-4">
        `;
        
        // Mostra i giocatori per ogni ruolo
        const roleLabels = { P: 'Portieri', D: 'Difensori', C: 'Centrocampisti', A: 'Attaccanti' };
        const roleColors = { P: 'yellow', D: 'blue', C: 'green', A: 'red' };
        
        for (const [roleKey, roleLabel] of Object.entries(roleLabels)) {
            const rolePlayers = roles[roleKey];
            if (rolePlayers.length > 0) {
                const color = roleColors[roleKey];
                html += `
                    <div>
                        <h4 class="text-sm font-bold text-${color}-400 mb-2 flex items-center">
                            <span class="inline-block w-6 h-6 rounded-full bg-${color}-900 text-${color}-300 text-center text-xs leading-6 mr-2">${roleKey}</span>
                            ${roleLabel} (${rolePlayers.length})
                        </h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                `;
                
                // Ordina i giocatori per costo decrescente
                rolePlayers.sort((a, b) => b.cost - a.cost);
                
                for (const player of rolePlayers) {
                    html += `
                        <div class="bg-gray-700 rounded px-3 py-2 flex justify-between items-center">
                            <div>
                                <p class="text-sm font-medium text-white">${player.playerName}</p>
                                <p class="text-xs text-gray-400">${player.serieATeam}</p>
                            </div>
                            <span class="text-sm font-bold text-yellow-400">${player.cost}</span>
                        </div>
                    `;
                }
                
                html += `
                        </div>
                    </div>
                `;
            }
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    
    if (squadsMap.size === 0) {
        html = '<p class="text-center text-gray-500 py-8">Nessuna squadra trovata.</p>';
    }
    
    container.innerHTML = html;
};

/**
 * Filtra la vista delle rose
 */
export const filterSquadView = () => {
    const filterValue = document.getElementById('squad-filter').value;
    
    if (!currentSquadsData || currentSquadsData.size === 0) return;
    
    if (filterValue === 'all') {
        renderSquadsView(currentSquadsData);
    } else {
        const filteredMap = new Map();
        if (currentSquadsData.has(filterValue)) {
            filteredMap.set(filterValue, currentSquadsData.get(filterValue));
        }
        renderSquadsView(filteredMap);
    }
};

// ==================== STATISTICHE LEGA ====================

/**
 * Carica i dati della sezione Statistiche Lega
 */
export const loadLeagueStatsData = () => {
    try {
        // Richiama le funzioni esistenti per popolare i container
        if (renderStatistics) renderStatistics();
        loadPlayerLeaderboards();
    } catch (error) {
        console.error('Errore caricamento statistiche lega:', error);
    }
};

/**
 * Carica il grafico dell'andamento classifica
 */
export const loadStandingsTrendChart = () => {
    try {
        if (renderStandingsTrend) renderStandingsTrend();
    } catch (error) {
        console.error('Errore caricamento andamento classifica:', error);
    }
};

// Esporta variabili per window
window.currentPlayerStats = currentPlayerStats;
window.currentFilteredStats = currentFilteredStats;
window.currentSquadsData = currentSquadsData;

// Esporta funzioni globali
window.loadPlayerStats = loadPlayerStats;
window.sortPlayerStats = sortPlayerStats;
window.filterPlayerStats = filterPlayerStats;
window.loadPlayerLeaderboards = loadPlayerLeaderboards;
window.clearPlayerStats = clearPlayerStats;
window.clearSquadsData = clearSquadsData;
window.loadSquadsData = loadSquadsData;
window.filterSquadView = filterSquadView;
window.loadLeagueStatsData = loadLeagueStatsData;
window.loadStandingsTrendChart = loadStandingsTrendChart;
