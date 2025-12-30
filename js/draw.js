/**
 * draw.js - Modulo per sorteggio Coppa Italia
 * Sorteggio animato delle squadre in due gironi A e B
 */

import { 
    db,
    getDocs,
    getPlayerStatsCollectionRef
} from './firebase-config.js';
import { messageBox } from './utils.js';
import { getTeamLogo } from './config.js';
import { getIsUserAdmin } from './auth.js';
import { getAllTeams } from './state.js';

// Stato del sorteggio
let drawState = {
    teams: [],
    groupA: [],
    groupB: [],
    currentIndex: 0,
    isDrawing: false
};

// Cache delle statistiche giocatori
let playerStatsCache = null;

// Dipendenze esterne
let calculateStandings = null;

/**
 * Imposta le dipendenze esterne
 */
export const setDrawDependencies = (deps) => {
    if (deps.calculateStandings) calculateStandings = deps.calculateStandings;
};

/**
 * Ottiene le statistiche di una squadra per il sorteggio
 */
export const getTeamStats = async (teamName) => {
    try {
        // Calcola posizione in classifica
        const standings = calculateStandings ? calculateStandings() : [];
        const position = standings.findIndex(s => s.team === teamName) + 1;
        
        // Carica statistiche dalla collection fantabet_player_stats
        let teamPlayers = [];
        
        // Se non abbiamo ancora caricato le statistiche, caricale ora
        if (!playerStatsCache) {
            const statsSnapshot = await getDocs(getPlayerStatsCollectionRef());
            const statsMap = new Map();
            statsSnapshot.forEach(doc => {
                const player = doc.data();
                // Il campo si chiama fantaSquad nelle statistiche
                const squadra = player.fantaSquad || player.squadName;
                if (squadra) {
                    if (!statsMap.has(squadra)) {
                        statsMap.set(squadra, []);
                    }
                    statsMap.get(squadra).push(player);
                }
            });
            playerStatsCache = statsMap;
            console.log(`Cache statistiche caricata: ${statsMap.size} squadre, ${statsSnapshot.size} giocatori totali`);
        }
        
        // Ottieni i giocatori della squadra dalla cache
        if (playerStatsCache && playerStatsCache.has(teamName)) {
            teamPlayers = playerStatsCache.get(teamName);
        }
        
        console.log(`Statistiche per ${teamName}:`, {
            totalPlayers: teamPlayers.length,
            usingCachedData: !!playerStatsCache,
            cacheSize: playerStatsCache?.size || 0,
            trovati: teamPlayers.slice(0, 3).map(p => ({ 
                name: p.Name || p.playerName, 
                squadra: p.fantaSquad || p.squadName, 
                gol: p.gf || p.Gf, 
                fm: p.fm || p.Fm, 
                pv: p.pv || p.Pv 
            }))
        });
        
        if (teamPlayers.length === 0) {
            console.warn(`⚠️ Nessuna statistica trovata per ${teamName}. La collezione fantabet_player_stats potrebbe essere vuota.`);
            console.warn('Per caricare le statistiche, vai in Admin → Carica Statistiche CSV');
            return {
                position: position > 0 ? position : '-',
                topScorer: null,
                bestPlayer: null
            };
        }
        
        // Trova miglior marcatore (più gol, anche se 0)
        const topScorer = teamPlayers.reduce((best, player) => {
            const goals = player.gf || player.Gf || 0;
            if (!best || goals > (best.gf || best.Gf || 0)) {
                return player;
            }
            return best;
        }, null);
        
        // Trova giocatore migliore (fantamedia più alta)
        // Prima prova con minimo 5 presenze, poi con minimo 3, poi con minimo 1
        let bestPlayer = teamPlayers
            .filter(p => (p.pv || p.Pv || 0) >= 5)
            .reduce((best, player) => {
                const fm = player.fm || player.Fm || 0;
                if (!best || fm > (best.fm || best.Fm || 0)) {
                    return player;
                }
                return best;
            }, null);
        
        // Se non ci sono giocatori con almeno 5 presenze, prova con 3
        if (!bestPlayer) {
            bestPlayer = teamPlayers
                .filter(p => (p.pv || p.Pv || 0) >= 3)
                .reduce((best, player) => {
                    const fm = player.fm || player.Fm || 0;
                    if (!best || fm > (best.fm || best.Fm || 0)) {
                        return player;
                    }
                    return best;
                }, null);
        }
        
        // Se ancora null, prova con almeno 1 presenza
        if (!bestPlayer) {
            bestPlayer = teamPlayers
                .filter(p => (p.pv || p.Pv || 0) >= 1)
                .reduce((best, player) => {
                    const fm = player.fm || player.Fm || 0;
                    if (!best || fm > (best.fm || best.Fm || 0)) {
                        return player;
                    }
                    return best;
                }, null);
        }
        
        const result = {
            position: position > 0 ? position : '-',
            topScorer: topScorer, // Mostra sempre, anche con 0 gol
            bestPlayer: bestPlayer
        };
        
        console.log(`Risultato statistiche per ${teamName}:`, result);
        
        return result;
    } catch (error) {
        console.error('Errore nel recupero statistiche squadra:', error);
        return {
            position: '-',
            topScorer: null,
            bestPlayer: null
        };
    }
};

/**
 * Avvia il sorteggio Coppa Italia
 */
export const startDraw = () => {
    const isUserAdmin = getIsUserAdmin();
    
    if (!isUserAdmin) {
        messageBox('Permesso negato. Solo gli admin possono eseguire questa operazione.');
        return;
    }

    const allTeams = getAllTeams();
    const teamsList = Array.isArray(allTeams) ? allTeams.slice() : [];
    
    if (teamsList.length !== 10) {
        messageBox(`Per la Coppa Italia servono esattamente 10 squadre. Trovate: ${teamsList.length}`);
        return;
    }

    // Fisher-Yates shuffle
    for (let i = teamsList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teamsList[i], teamsList[j]] = [teamsList[j], teamsList[i]];
    }

    // Inizializza lo stato
    drawState = {
        teams: teamsList,
        groupA: [],
        groupB: [],
        currentIndex: 0,
        isDrawing: true
    };
    
    // Mostra interfaccia in progress
    document.getElementById('draw-initial').classList.add('hidden');
    document.getElementById('draw-in-progress').classList.remove('hidden');
    document.getElementById('draw-complete').classList.add('hidden');
    
    // Reset gruppi
    const groupAContainer = document.getElementById('group-a-teams');
    const groupBContainer = document.getElementById('group-b-teams');
    if (groupAContainer) groupAContainer.innerHTML = '<p class="text-gray-500 text-center text-sm py-4">In attesa...</p>';
    if (groupBContainer) groupBContainer.innerHTML = '<p class="text-gray-500 text-center text-sm py-4">In attesa...</p>';
    
    // Estrai la prima squadra
    drawNextTeam();
};

/**
 * Estrae la prossima squadra
 */
export const drawNextTeam = async () => {
    if (!drawState.isDrawing || drawState.currentIndex >= drawState.teams.length) {
        return;
    }
    
    const teamName = drawState.teams[drawState.currentIndex];
    const isGroupA = drawState.currentIndex % 2 === 0;
    const currentGroup = isGroupA ? 'A' : 'B';
    
    // Aggiorna contatore
    document.getElementById('draw-count').textContent = drawState.currentIndex + 1;
    document.getElementById('current-group-label').textContent = `GRUPPO ${currentGroup}`;
    document.getElementById('current-group-label').className = isGroupA 
        ? 'text-2xl font-bold text-emerald-400 mb-2' 
        : 'text-2xl font-bold text-sky-400 mb-2';
    
    // Nascondi squadra precedente
    document.getElementById('drawn-team').classList.add('hidden');
    
    // Animazione urna
    const urnIcon = document.getElementById('draw-icon');
    urnIcon.style.animation = 'none';
    setTimeout(() => {
        urnIcon.style.animation = 'spin 0.5s ease-in-out';
    }, 10);
    
    // Carica statistiche squadra
    const stats = await getTeamStats(teamName);
    
    // Mostra subito il card con animazione suspense di 3 secondi
    const drawnTeamCard = document.getElementById('drawn-team');
    const teamLogo = document.getElementById('drawn-team-logo');
    const teamNameEl = document.getElementById('drawn-team-name');
    const statsContainer = document.getElementById('drawn-team-stats');
    
    // Imposta i dati prima dell'animazione
    teamLogo.src = getTeamLogo(teamName);
    teamNameEl.textContent = teamName;
    
    // Mostra il card con animazione suspense (senza statistiche)
    drawnTeamCard.classList.remove('hidden');
    teamLogo.classList.add('suspense-animation');
    teamNameEl.classList.add('suspense-animation');
    
    // Nascondi temporaneamente le statistiche durante la suspense
    if (statsContainer) {
        statsContainer.style.opacity = '0';
    }
    
    // Attendi 5 secondi per mostrare le statistiche
    setTimeout(() => {
        // Rimuovi animazione
        teamLogo.classList.remove('suspense-animation');
        teamNameEl.classList.remove('suspense-animation');
        
        // Crea e mostra le statistiche dopo la suspense
        let statsHtml = `
            <div class="mt-4 space-y-3">
                <div class="flex justify-center items-center">
                    <span class="text-lg font-bold text-yellow-300 bg-yellow-900/30 px-4 py-2 rounded-full">📊 Posizione attuale in campionato: ${stats.position}°</span>
                </div>
        `;
        
        console.log('DEBUG stats:', stats);
        console.log('topScorer:', stats.topScorer);
        console.log('bestPlayer:', stats.bestPlayer);
        
        if (stats.topScorer) {
            const scorerName = stats.topScorer.Name || stats.topScorer.playerName || 'Sconosciuto';
            const goalsScored = stats.topScorer.gf || stats.topScorer.Gf || 0;
            statsHtml += `
                <div class="space-y-1">
                    <div class="text-xs font-semibold text-green-400 text-center tracking-wide">MIGLIOR TOPSCORER</div>
                    <div class="flex items-center justify-center space-x-3 text-base bg-green-900/20 px-4 py-2.5 rounded-lg">
                        <span class="text-2xl">⚽</span>
                        <div class="text-left">
                            <div class="font-semibold text-white text-lg">${scorerName}</div>
                            <div class="text-sm text-gray-300">${goalsScored} gol</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            statsHtml += `<div class="text-sm text-red-400 text-center">⚽ Nessun marcatore disponibile</div>`;
        }
        
        if (stats.bestPlayer) {
            const bestName = stats.bestPlayer.Name || stats.bestPlayer.playerName || 'Sconosciuto';
            const fantaMedia = stats.bestPlayer.fm || stats.bestPlayer.Fm || 0;
            statsHtml += `
                <div class="space-y-1">
                    <div class="text-xs font-semibold text-blue-400 text-center tracking-wide">MIGLIOR CALCIATORE FMV</div>
                    <div class="flex items-center justify-center space-x-3 text-base bg-blue-900/20 px-4 py-2.5 rounded-lg">
                        <span class="text-2xl">⭐</span>
                        <div class="text-left">
                            <div class="font-semibold text-white text-lg">${bestName}</div>
                            <div class="text-sm text-gray-300">FM ${fantaMedia.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            statsHtml += `<div class="text-sm text-red-400 text-center">⭐ Nessun giocatore disponibile (min 5 presenze)</div>`;
        }
        
        statsHtml += '</div>';
        
        // Mostra le statistiche immediatamente
        if (statsContainer) {
            statsContainer.innerHTML = statsHtml;
            statsContainer.style.opacity = '1';
            statsContainer.style.transition = 'none';
        }
        
        // Aggiungi al gruppo corretto (solo nome, senza statistiche)
        if (isGroupA) {
            drawState.groupA.push(teamName);
        } else {
            drawState.groupB.push(teamName);
        }
        
        // Aggiorna visualizzazione gruppi
        updateGroupsDisplay();
        
        drawState.currentIndex++;
        
        // Se finito, mostra completamento
        if (drawState.currentIndex >= drawState.teams.length) {
            setTimeout(() => {
                completeDraw();
            }, 1500);
            document.getElementById('draw-next-btn').disabled = true;
            document.getElementById('draw-next-btn').classList.add('opacity-50', 'cursor-not-allowed');
        }
    }, 5000); // 5 secondi di suspense
};

/**
 * Aggiorna la visualizzazione dei gruppi
 */
const updateGroupsDisplay = () => {
    const groupAContainer = document.getElementById('group-a-teams');
    const groupBContainer = document.getElementById('group-b-teams');
    
    if (drawState.groupA.length > 0) {
        groupAContainer.innerHTML = drawState.groupA.map((teamName, index) => {
            return `
                <div class="bg-emerald-800/30 rounded-lg p-3 animate-scale-in">
                    <div class="flex items-center space-x-3">
                        <span class="text-2xl font-bold text-emerald-300 w-8">${index + 1}.</span>
                        <img src="${getTeamLogo(teamName)}" alt="${teamName}" class="w-12 h-12 object-contain flex-shrink-0" onerror="this.style.display='none'">
                        <span class="text-lg font-semibold text-white flex-1">${teamName}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    if (drawState.groupB.length > 0) {
        groupBContainer.innerHTML = drawState.groupB.map((teamName, index) => {
            return `
                <div class="bg-sky-800/30 rounded-lg p-3 animate-scale-in">
                    <div class="flex items-center space-x-3">
                        <span class="text-2xl font-bold text-sky-300 w-8">${index + 1}.</span>
                        <img src="${getTeamLogo(teamName)}" alt="${teamName}" class="w-12 h-12 object-contain flex-shrink-0" onerror="this.style.display='none'">
                        <span class="text-lg font-semibold text-white flex-1">${teamName}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

/**
 * Completa il sorteggio
 */
const completeDraw = () => {
    // Mostra completamento
    document.getElementById('draw-in-progress').classList.add('hidden');
    document.getElementById('draw-complete').classList.remove('hidden');
    
    drawState.isDrawing = false;
    
    // Chiedi conferma per salvare
    setTimeout(() => {
        if (confirm('Sorteggio completato! Vuoi salvare questo sorteggio?')) {
            // Salva risultato
            window.lastCoppaDraw = {
                timestamp: Date.now(),
                groups: {
                    A: drawState.groupA,
                    B: drawState.groupB
                }
            };
            messageBox('Sorteggio salvato con successo!');
        } else {
            messageBox('Sorteggio non salvato.');
        }
    }, 500);
};

/**
 * Reset del sorteggio
 */
export const resetDraw = () => {
    drawState = {
        teams: [],
        groupA: [],
        groupB: [],
        currentIndex: 0,
        isDrawing: false
    };
    
    document.getElementById('draw-initial').classList.remove('hidden');
    document.getElementById('draw-in-progress').classList.add('hidden');
    document.getElementById('draw-complete').classList.add('hidden');
    document.getElementById('draw-next-btn').disabled = false;
    document.getElementById('draw-next-btn').classList.remove('opacity-50', 'cursor-not-allowed');
    
    // Reset gruppi
    const groupAContainer = document.getElementById('group-a-teams');
    const groupBContainer = document.getElementById('group-b-teams');
    if (groupAContainer) groupAContainer.innerHTML = '<p class="text-gray-500 text-center text-sm py-4">In attesa...</p>';
    if (groupBContainer) groupBContainer.innerHTML = '<p class="text-gray-500 text-center text-sm py-4">In attesa...</p>';
};

/**
 * Copia l'ultimo sorteggio negli appunti
 */
export const copyLastDraw = () => {
    if (!window.lastCoppaDraw) {
        messageBox('Nessun sorteggio disponibile da copiare.');
        return;
    }
    const json = JSON.stringify(window.lastCoppaDraw, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(() => messageBox('JSON del sorteggio copiato negli appunti.'))
            .catch(err => messageBox('Impossibile copiare negli appunti: ' + err.message));
    } else {
        // Fallback: crea textarea temporanea
        const ta = document.createElement('textarea');
        ta.value = json;
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            messageBox('JSON del sorteggio copiato negli appunti.');
        } catch (err) {
            messageBox('Copia non supportata dal browser.');
        }
        document.body.removeChild(ta);
    }
};

// Getter per stato sorteggio
export const getDrawState = () => drawState;
export const getLastCoppaDraw = () => window.lastCoppaDraw;

// Esporta funzioni globali
window.startDraw = startDraw;
window.drawNextTeam = drawNextTeam;
window.resetDraw = resetDraw;
window.copyLastDraw = copyLastDraw;
window.lastCoppaDraw = null;
