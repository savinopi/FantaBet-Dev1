/**
 * match-details.js - Modulo per visualizzare i dettagli del match con le formazioni
 * Mostra titolari, panchina e voti dalla collection formazioni
 */

import {
    getDocs,
    query,
    where,
    getFormationsCollectionRef,
    getSquadBonusesCollectionRef
} from './firebase-config.js';
import { getTeamLogo } from './config.js';
import { calculateDeployedFormation, isValidFormation } from './coach-stats.js';

/**
 * Mostra il dettaglio del match con le formazioni caricate
 * @param {Object} matchData - Dati del match (homeTeam, awayTeam, giornata, score, homePoints, awayPoints)
 */
export const showMatchDetails = async (matchData) => {
    try {
        console.log('Debug match details:', {
            giornata: matchData.giornata,
            homeTeam: matchData.homeTeam,
            awayTeam: matchData.awayTeam,
            type: typeof matchData.giornata
        });

        // Crea il modal se non esiste
        let modal = document.getElementById('match-details-modal');
        if (!modal) {
            createMatchDetailsModal();
            modal = document.getElementById('match-details-modal');
        }

        // Carica le formazioni per questa giornata
        const formationsCollection = getFormationsCollectionRef();
        
        // Converti giornata a numero se è stringa
        const giornataNum = typeof matchData.giornata === 'string' 
            ? parseInt(matchData.giornata) 
            : matchData.giornata;
        
        const q = query(
            formationsCollection,
            where('giornata', '==', giornataNum)
        );
        const snapshot = await getDocs(q);

        console.log(`Formazioni trovate per giornata ${giornataNum}:`, snapshot.size);

        // Filtra per squadre di questo match
        const homeFormations = [];
        const awayFormations = [];

        snapshot.forEach(doc => {
            const formation = doc.data();
            // Normalizza i nomi per il confronto (converti in maiuscolo)
            const formationSquadra = (formation.squadra || '').toUpperCase().trim();
            const homeTeamNorm = (matchData.homeTeam || '').toUpperCase().trim();
            const awayTeamNorm = (matchData.awayTeam || '').toUpperCase().trim();
            
            if (formationSquadra === homeTeamNorm) {
                homeFormations.push(formation);
            } else if (formationSquadra === awayTeamNorm) {
                awayFormations.push(formation);
            }
        });

        console.log(`Home formations: ${homeFormations.length}, Away formations: ${awayFormations.length}`);
        
        // Debug bonus
        if (homeFormations.length > 0) {
            console.log('Sample home formation with bonus:', {
                calciatore: homeFormations[0].calciatore,
                bonus: homeFormations[0].bonus,
                bonus_nome: homeFormations[0].bonus_nome,
                bonus_valore: homeFormations[0].bonus_valore
            });
        }

        // Renderizza il contenuto del modal
        const contentDiv = document.getElementById('match-details-content');
        if (contentDiv) {
            contentDiv.innerHTML = await renderMatchDetailsContent(matchData, homeFormations, awayFormations);
        }

        // Mostra il modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

    } catch (error) {
        console.error('Errore nel caricamento dettagli match:', error);
        alert('Errore nel caricamento dei dettagli del match: ' + error.message);
    }
};

/**
 * Chiude il modal dei dettagli del match
 */
export const closeMatchDetails = () => {
    const modal = document.getElementById('match-details-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

/**
 * Crea il modal HTML per i dettagli del match
 */
const createMatchDetailsModal = () => {
    const html = `
        <div id="match-details-modal" class="hidden fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div class="bg-gray-900 border border-gray-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <!-- Header -->
                <div class="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
                    <h2 id="match-details-title" class="text-xl font-bold text-blue-400"></h2>
                    <button onclick="closeMatchDetails()" class="text-gray-400 hover:text-white text-2xl">
                        ✕
                    </button>
                </div>
                <!-- Contenuto -->
                <div id="match-details-content" class="p-4 sm:p-6 space-y-6">
                    <!-- Verrà popolato dinamicamente -->
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
};

/**
 * Renderizza il contenuto del dettaglio del match
 */
const renderMatchDetailsContent = async (matchData, homeFormations, awayFormations) => {
    const homeLogo = getTeamLogo(matchData.homeTeam);
    const awayLogo = getTeamLogo(matchData.awayTeam);

    // Aggiorna il titolo
    const titleEl = document.getElementById('match-details-title');
    if (titleEl) {
        titleEl.textContent = `${matchData.homeTeam} vs ${matchData.awayTeam}`;
    }

    // Debug: nessun dato trovato
    if (homeFormations.length === 0 && awayFormations.length === 0) {
        return `
            <div class="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 text-yellow-300">
                <p class="font-bold mb-2">⚠️ Nessun dato caricato per questa giornata</p>
                <p class="text-sm">Giornata: ${matchData.giornata}</p>
                <p class="text-sm">${matchData.homeTeam} vs ${matchData.awayTeam}</p>
                <p class="text-xs text-yellow-500 mt-2">Verifica che il CSV sia stato caricato correttamente nella sezione Settings > Dati CSV > Caricamento Formazioni Giornate</p>
            </div>
        `;
    }

    let html = `
        <!-- Header Match -->
        <div class="flex items-center justify-between mb-6 bg-gray-800 p-4 rounded-lg">
            <div class="flex flex-col items-center flex-1">
                ${homeLogo ? `<img src="${homeLogo}" alt="${matchData.homeTeam}" class="w-12 h-12 object-contain mb-2" onerror="this.style.display='none'">` : ''}
                <p class="font-bold text-white text-center">${matchData.homeTeam}</p>
            </div>
            <div class="flex flex-col items-center mx-4">
                <p class="text-3xl font-bold text-green-400">${matchData.score || '-'}</p>
                <p class="text-sm text-gray-400 mt-1">
                    <span class="text-blue-400">${matchData.homePoints || '-'}</span>
                    <span class="text-gray-600">|</span>
                    <span class="text-blue-400">${matchData.awayPoints || '-'}</span>
                </p>
            </div>
            <div class="flex flex-col items-center flex-1">
                ${awayLogo ? `<img src="${awayLogo}" alt="${matchData.awayTeam}" class="w-12 h-12 object-contain mb-2" onerror="this.style.display='none'">` : ''}
                <p class="font-bold text-white text-center">${matchData.awayTeam}</p>
            </div>
        </div>

        <!-- Sezione Squadre -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Casa -->
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-blue-400 border-b border-blue-500/30 pb-2">${matchData.homeTeam}</h3>
                ${renderFormationSection(homeFormations)}
                ${await renderTeamBonusSection(matchData.giornata, matchData.homeTeam)}
            </div>
            <!-- Ospiti -->
            <div class="space-y-4">
                <h3 class="text-lg font-bold text-blue-400 border-b border-blue-500/30 pb-2">${matchData.awayTeam}</h3>
                ${renderFormationSection(awayFormations)}
                ${await renderTeamBonusSection(matchData.giornata, matchData.awayTeam)}
            </div>
        </div>
    `;

    return html;
};

/**
 * Renderizza i bonus totali della squadra in fondo
 */
const renderTeamBonusSection = async (giornata, squadra) => {
    if (!giornata || !squadra) return '';
    
    try {
        // Carica i bonus dalla collection
        const bonusesCollection = getSquadBonusesCollectionRef();
        const q = query(
            bonusesCollection,
            where('giornata', '==', typeof giornata === 'string' ? parseInt(giornata) : giornata),
            where('squadra', '==', (squadra || '').toUpperCase().trim())
        );
        
        const snapshot = await getDocs(q);
        const bonusList = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            // Accetta anche bonus negativi (valore !== 0)
            if (data.bonus && data.bonus.nome && data.bonus.valore !== 0) {
                bonusList.push(data.bonus);
            }
        });
        
        if (bonusList.length === 0) return '';
        
        let html = `
            <div class="bg-gray-700 rounded-lg p-3 border border-yellow-600/50">
                <h5 class="text-sm font-bold text-yellow-400 mb-2">Bonus Squadra</h5>
        `;
        
        bonusList.forEach(bonus => {
            const bonusType = bonus.nome.toLowerCase();
            const isNegative = bonus.valore < 0;
            let icon = '';
            let bgColor = 'bg-yellow-600/30';
            
            if (bonusType.includes('fairplay')) {
                icon = '✓';
                bgColor = 'bg-green-600/30 text-green-300';
            } else if (bonusType.includes('difesa')) {
                icon = '🛡️';
                bgColor = 'bg-blue-600/30 text-blue-300';
            } else if (bonusType.includes('altri')) {
                // "Altri bonus" - può essere positivo o negativo
                if (isNegative) {
                    icon = '✗';
                    bgColor = 'bg-red-600/30 text-red-300';
                } else {
                    icon = '✓';
                    bgColor = 'bg-green-600/30 text-green-300';
                }
            }
            
            // Mostra + solo se positivo, altrimenti il - è già nel valore
            const valueDisplay = bonus.valore > 0 ? `+${bonus.valore}` : bonus.valore;

            html += `
                <div class="flex items-center justify-between text-sm mb-2">
                    <span class="text-gray-300">${bonus.nome}</span>
                    <span class="${bgColor} px-2 py-1 rounded">${icon} ${valueDisplay}</span>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        return html;
    } catch (error) {
        console.error('Errore nel caricamento bonus:', error);
        return '';
    }
};

/**
 * Renderizza la formazione schierata usando la logica Hybrid
 * Mostra i 11 titolari con indicazione di chi è stato sostituito
 * Poi mostra il resto della panchina
 */
const renderFormationSection = (formations) => {
    if (!formations || formations.length === 0) {
        return '<p class="text-gray-500 text-sm">Nessun giocatore caricato</p>';
    }
    
    // Usa l'algoritmo Hybrid per calcolare la formazione schierata
    const deployed = calculateDeployedFormation(formations);
    const deployedSet = new Set(deployed.players.map(p => p.calciatore));
    
    // Ordine dei ruoli
    const roleOrder = { 'P': 1, 'D': 2, 'C': 3, 'A': 4 };
    
    // Ordina i 11 schierati per ruolo
    const sortedDeployed = [...deployed.players].sort((a, b) => {
        const orderA = roleOrder[a.ruolo] || 99;
        const orderB = roleOrder[b.ruolo] || 99;
        return orderA - orderB;
    });
    
    let html = '';
    
    // Sezione Formazione Schierata (i 11 giocatori)
    html += `
        <div class="bg-gray-800 rounded-lg p-3 border-l-4 border-green-500">
            <h4 class="text-sm font-bold text-green-400 mb-3">
                Formazione Schierata (${deployed.formation})
            </h4>
            <div class="text-xs text-gray-400 mb-2 flex gap-2 px-2">
                <span class="flex-1">Giocatore</span>
                <span class="w-8 text-center">R</span>
                <span class="w-12 text-right">V</span>
                <span class="w-12 text-right">FV</span>
                <span class="w-16 text-right">Stato</span>
            </div>
            <div class="space-y-2">
    `;
    
    sortedDeployed.forEach(player => {
        html += renderPlayerRowWithStatus(player, player.isSubstitute);
    });
    
    html += `
            </div>
        </div>
    `;
    
    // Sezione Panchina (giocatori non schierati)
    const benchPlayers = formations.filter(f => f.sezione === 'PANCHINA' && !deployedSet.has(f.calciatore));
    
    if (benchPlayers.length > 0) {
        // Ordina per: prima giocatori con voto, poi per ruolo
        const sortedBench = benchPlayers.sort((a, b) => {
            const hasVotoA = a.voto_base && parseFloat(a.voto_base) > 0 ? 0 : 1;
            const hasVotoB = b.voto_base && parseFloat(b.voto_base) > 0 ? 0 : 1;
            
            if (hasVotoA !== hasVotoB) {
                return hasVotoA - hasVotoB;
            }
            
            const orderA = roleOrder[a.ruolo] || 99;
            const orderB = roleOrder[b.ruolo] || 99;
            return orderA - orderB;
        });
        
        html += `
            <div class="bg-gray-800 rounded-lg p-3 opacity-60">
                <h4 class="text-sm font-bold text-gray-400 mb-3">Panchina (Non Schierata)</h4>
                <div class="text-xs text-gray-400 mb-2 flex gap-2 px-2">
                    <span class="flex-1">Giocatore</span>
                    <span class="w-8 text-center">R</span>
                    <span class="w-12 text-right">V</span>
                    <span class="w-12 text-right">FV</span>
                </div>
                <div class="space-y-2">
        `;
        
        sortedBench.forEach(player => {
            html += renderPlayerRow(player);
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    return html;
};

/**
 * Renderizza una riga di giocatore con indicazione dello stato (titolare/subentrato)
 */
const renderPlayerRowWithStatus = (formation, isSubstitute) => {
    const voto_base = formation.voto_base !== null && formation.voto_base !== undefined ? parseFloat(formation.voto_base).toFixed(1) : '-';
    const fantavoto = formation.fantavoto !== null && formation.fantavoto !== undefined ? parseFloat(formation.fantavoto).toFixed(1) : '-';
    
    // Highlight giocatori che hanno giocato
    const hasPlayedClass = formation.ha_giocato ? 'text-white' : 'text-gray-500';
    
    // Indicatore status
    let statusBadge = '';
    if (isSubstitute) {
        statusBadge = '<span class="bg-yellow-600/50 text-yellow-300 text-xs px-2 py-1 rounded">Sub</span>';
    } else {
        statusBadge = '<span class="bg-green-600/50 text-green-300 text-xs px-2 py-1 rounded">Titolare</span>';
    }
    
    return `
        <div class="text-sm bg-gray-700/50 rounded px-3 py-2 flex gap-2 items-center">
            <div class="flex-1 min-w-0">
                <span class="font-medium ${hasPlayedClass}">${formation.calciatore}</span>
            </div>
            <div class="w-8 text-center">
                <span class="text-xs text-gray-400">${formation.ruolo}</span>
            </div>
            <div class="w-12 text-right">
                <span class="text-blue-300 font-bold">${voto_base}</span>
            </div>
            <div class="w-12 text-right">
                <span class="text-blue-300 font-bold">${fantavoto}</span>
            </div>
            <div class="w-16 text-right">
                ${statusBadge}
            </div>
        </div>
    `;
};

/**
 * Renderizza una riga di giocatore
 */
const renderPlayerRow = (formation) => {
    const voto_base = formation.voto_base !== null && formation.voto_base !== undefined ? parseFloat(formation.voto_base).toFixed(1) : '-';
    const fantavoto = formation.fantavoto !== null && formation.fantavoto !== undefined ? parseFloat(formation.fantavoto).toFixed(1) : '-';
    
    // Highlight giocatori che hanno giocato
    const hasPlayedClass = formation.ha_giocato ? 'text-white' : 'text-gray-500';
    
    return `
        <div class="text-sm bg-gray-700/50 rounded px-3 py-2 flex gap-2 items-center">
            <div class="flex-1 min-w-0">
                <span class="font-medium ${hasPlayedClass}">${formation.calciatore}</span>
            </div>
            <div class="w-8 text-center">
                <span class="text-xs text-gray-400">${formation.ruolo}</span>
            </div>
            <div class="w-12 text-right">
                <span class="text-blue-300 font-bold">${voto_base}</span>
            </div>
            <div class="w-12 text-right">
                <span class="text-blue-300 font-bold">${fantavoto}</span>
            </div>
        </div>
    `;
};

// Esponi globalmente
window.showMatchDetails = showMatchDetails;
window.closeMatchDetails = closeMatchDetails;
