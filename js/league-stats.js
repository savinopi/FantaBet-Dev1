/**
 * MODULO STATISTICHE LEGA
 * Gestisce il caricamento e la visualizzazione delle statistiche della lega
 */

import { messageBox } from './utils.js';
import { allResults } from './state.js';
import { getTeamLogo } from './config.js';

/**
 * Carica e visualizza i dati delle statistiche della lega
 */
export const loadLeagueStatsData = () => {
    try {
        renderStatistics();
        
        // Carica leaderboards se la funzione è disponibile
        if (typeof window.loadPlayerLeaderboards === 'function') {
            window.loadPlayerLeaderboards();
        } else {
            console.warn('[LoadLeagueStatsData] Funzione loadPlayerLeaderboards non disponibile');
        }
    } catch (error) {
        console.error('[LoadLeagueStatsData] Errore:', error);
        messageBox('Errore nel caricamento delle statistiche lega: ' + error.message);
    }
};

/**
 * Inizializza le statistiche della lega (chiamato quando si entra nella vista)
 */
export const initLeagueStats = () => {
    loadLeagueStatsData();
};

/**
 * Calcola le statistiche della lega dai risultati
 */
const calculateStatistics = () => {
    const stats = {
        bestAttack: { team: null, goalsFor: 0 },
        bestDefense: { team: null, goalsAgainst: Infinity },
        bestGoalDifference: { team: null, goalDifference: -Infinity },
        worstGoalDifference: { team: null, goalDifference: Infinity },
        highestScore: { team: null, score: 0, opponent: null, giornata: null },
        lowestScore: { team: null, score: Infinity, opponent: null, giornata: null },
        biggestWin: { team: null, margin: 0, score: null, opponent: null, giornata: null },
        highestDraw: { homeTeam: null, awayTeam: null, score: 0, giornata: null },
        lowestDraw: { homeTeam: null, awayTeam: null, score: Infinity, giornata: null },
        mostGoalsMatch: { homeTeam: null, awayTeam: null, totalGoals: 0, score: null, giornata: null },
        mostGoalsGiornata: { giornata: null, totalGoals: 0 },
        leastGoalsGiornata: { giornata: null, totalGoals: Infinity }
    };
    
    if (!allResults || allResults.length === 0) {
        return stats;
    }
    
    // Raccoglie tutte le squadre
    const teamsSet = new Set();
    allResults.forEach(result => {
        teamsSet.add(result.homeTeam);
        teamsSet.add(result.awayTeam);
    });
    
    // Analizza ogni squadra
    teamsSet.forEach(teamName => {
        const teamStats = calculateTeamStats(teamName);
        
        // Miglior attacco (più gol fatti)
        if (teamStats.goalsFor > stats.bestAttack.goalsFor) {
            stats.bestAttack = { team: teamName, goalsFor: teamStats.goalsFor };
        }
        
        // Miglior difesa (meno gol subiti)
        if (teamStats.goalsAgainst < stats.bestDefense.goalsAgainst) {
            stats.bestDefense = { team: teamName, goalsAgainst: teamStats.goalsAgainst };
        }
        
        // Miglior differenza reti
        if (teamStats.goalDifference > stats.bestGoalDifference.goalDifference) {
            stats.bestGoalDifference = { team: teamName, goalDifference: teamStats.goalDifference };
        }
        
        // Peggior differenza reti
        if (teamStats.goalDifference < stats.worstGoalDifference.goalDifference) {
            stats.worstGoalDifference = { team: teamName, goalDifference: teamStats.goalDifference };
        }
    });
    
    // Trova il punteggio più alto e più basso in una singola partita
    allResults.forEach(result => {
        const homeScore = result.homePoints || 0;
        const awayScore = result.awayPoints || 0;
        
        // Controlla punteggio casa per massimo
        if (homeScore > stats.highestScore.score) {
            stats.highestScore = {
                team: result.homeTeam,
                score: homeScore,
                opponent: result.awayTeam,
                giornata: result.giornata
            };
        }
        
        // Controlla punteggio ospite per massimo
        if (awayScore > stats.highestScore.score) {
            stats.highestScore = {
                team: result.awayTeam,
                score: awayScore,
                opponent: result.homeTeam,
                giornata: result.giornata
            };
        }
        
        // Controlla punteggio minimo
        if (homeScore > 0 && homeScore < stats.lowestScore.score) {
            stats.lowestScore = {
                team: result.homeTeam,
                score: homeScore,
                opponent: result.awayTeam,
                giornata: result.giornata
            };
        }
        
        if (awayScore > 0 && awayScore < stats.lowestScore.score) {
            stats.lowestScore = {
                team: result.awayTeam,
                score: awayScore,
                opponent: result.homeTeam,
                giornata: result.giornata
            };
        }
        
        // Vittoria con il margine più ampio
        const margin = Math.abs(homeScore - awayScore);
        if (result.result !== 'X' && margin > stats.biggestWin.margin) {
            const winner = result.result === '1' ? result.homeTeam : result.awayTeam;
            const loser = result.result === '1' ? result.awayTeam : result.homeTeam;
            stats.biggestWin = {
                team: winner,
                margin: margin,
                score: `${Math.max(homeScore, awayScore).toFixed(1)}-${Math.min(homeScore, awayScore).toFixed(1)}`,
                opponent: loser,
                giornata: result.giornata
            };
        }
        
        // Pareggi con punteggi alti e bassi
        if (result.result === 'X') {
            const drawScore = homeScore; // In caso di pareggio homeScore === awayScore
            
            if (drawScore > stats.highestDraw.score) {
                stats.highestDraw = {
                    homeTeam: result.homeTeam,
                    awayTeam: result.awayTeam,
                    score: drawScore,
                    giornata: result.giornata
                };
            }
            
            if (drawScore > 0 && drawScore < stats.lowestDraw.score) {
                stats.lowestDraw = {
                    homeTeam: result.homeTeam,
                    awayTeam: result.awayTeam,
                    score: drawScore,
                    giornata: result.giornata
                };
            }
        }
        
        // Partita con il maggior numero di gol (dal campo score, non dai punti)
        if (result.score && result.score.includes('-')) {
            const [homeGoals, awayGoals] = result.score.split('-').map(g => parseInt(g.trim(), 10));
            const totalGoals = homeGoals + awayGoals;
            
            if (totalGoals > stats.mostGoalsMatch.totalGoals) {
                stats.mostGoalsMatch = {
                    homeTeam: result.homeTeam,
                    awayTeam: result.awayTeam,
                    totalGoals: totalGoals,
                    score: result.score,
                    giornata: result.giornata
                };
            }
        }
    });
    
    // Giornate con maggior e minor numero di gol (somma dei gol effettivi, non dei punti)
    const giornateGoals = {};
    allResults.forEach(result => {
        const giornata = result.giornata;
        if (!giornateGoals[giornata]) {
            giornateGoals[giornata] = 0;
        }
        
        // Estrai i gol dal campo score
        if (result.score && result.score.includes('-')) {
            const [homeGoals, awayGoals] = result.score.split('-').map(g => parseInt(g.trim(), 10));
            giornateGoals[giornata] += homeGoals + awayGoals;
        }
    });
    
    Object.entries(giornateGoals).forEach(([giornata, totalGoals]) => {
        if (totalGoals > stats.mostGoalsGiornata.totalGoals) {
            stats.mostGoalsGiornata = { giornata, totalGoals };
        }
        
        if (totalGoals < stats.leastGoalsGiornata.totalGoals) {
            stats.leastGoalsGiornata = { giornata, totalGoals };
        }
    });
    
    return stats;
};

/**
 * Calcola le statistiche di una singola squadra
 */
const calculateTeamStats = (teamName) => {
    let goalsFor = 0;
    let goalsAgainst = 0;
    
    allResults.forEach(result => {
        if (result.homeTeam === teamName) {
            if (result.score && result.score.includes('-')) {
                const [home, away] = result.score.split('-').map(g => parseInt(g.trim(), 10));
                goalsFor += home;
                goalsAgainst += away;
            }
        } else if (result.awayTeam === teamName) {
            if (result.score && result.score.includes('-')) {
                const [home, away] = result.score.split('-').map(g => parseInt(g.trim(), 10));
                goalsFor += away;
                goalsAgainst += home;
            }
        }
    });
    
    return {
        goalsFor,
        goalsAgainst,
        goalDifference: goalsFor - goalsAgainst
    };
};

/**
 * Renderizza le statistiche della lega
 */
const renderStatistics = () => {
    const container = document.getElementById('statistics-container');
    if (!container) {
        console.error('[RenderStatistics] Container non trovato');
        return;
    }
    
    if (!allResults || allResults.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Nessun dato disponibile</p>';
        return;
    }
    
    const stats = calculateStatistics();
    
    container.innerHTML = `
        <!-- STATISTICHE PRINCIPALI (sempre visibili) -->
        <!-- Miglior Attacco -->
        <div class="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-red-300 uppercase">Miglior Attacco</h4>
            </div>
            ${stats.bestAttack.team ? `
                <div class="flex items-center space-x-3">
                    <img src="${getTeamLogo(stats.bestAttack.team)}" alt="${stats.bestAttack.team}" class="w-10 h-10 object-contain" onerror="this.style.display='none'">
                    <div>
                        <p class="text-lg font-bold text-white">${stats.bestAttack.team}</p>
                        <p class="text-2xl font-bold text-red-400">${stats.bestAttack.goalsFor} gol</p>
                    </div>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Miglior Difesa -->
        <div class="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-blue-300 uppercase">Miglior Difesa</h4>
            </div>
            ${stats.bestDefense.team ? `
                <div class="flex items-center space-x-3">
                    <img src="${getTeamLogo(stats.bestDefense.team)}" alt="${stats.bestDefense.team}" class="w-10 h-10 object-contain" onerror="this.style.display='none'">
                    <div>
                        <p class="text-lg font-bold text-white">${stats.bestDefense.team}</p>
                        <p class="text-2xl font-bold text-blue-400">${stats.bestDefense.goalsAgainst} gol subiti</p>
                    </div>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Punteggio Più Alto -->
        <div class="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                <h4 class="text-sm font-bold text-purple-300 uppercase">Punteggio Più Alto</h4>
            </div>
            ${stats.highestScore.team ? `
                <div class="flex items-center space-x-3">
                    <img src="${getTeamLogo(stats.highestScore.team)}" alt="${stats.highestScore.team}" class="w-10 h-10 object-contain" onerror="this.style.display='none'">
                    <div>
                        <p class="text-lg font-bold text-white">${stats.highestScore.team}</p>
                        <p class="text-2xl font-bold text-purple-400">${stats.highestScore.score.toFixed(1)} punti</p>
                        <p class="text-xs text-gray-400">vs ${stats.highestScore.opponent} - Giornata ${stats.highestScore.giornata}</p>
                    </div>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Vittoria con Margine Più Ampio -->
        <div class="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
                </svg>
                <h4 class="text-sm font-bold text-yellow-300 uppercase">Vittoria Più Larga</h4>
            </div>
            ${stats.biggestWin.team ? `
                <div class="flex items-center space-x-3">
                    <img src="${getTeamLogo(stats.biggestWin.team)}" alt="${stats.biggestWin.team}" class="w-10 h-10 object-contain" onerror="this.style.display='none'">
                    <div>
                        <p class="text-lg font-bold text-white">${stats.biggestWin.team}</p>
                        <p class="text-2xl font-bold text-yellow-400">+${stats.biggestWin.margin.toFixed(1)} punti</p>
                        <p class="text-xs text-gray-400">${stats.biggestWin.score} vs ${stats.biggestWin.opponent} - G.${stats.biggestWin.giornata}</p>
                    </div>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- STATISTICHE AGGIUNTIVE (sempre visibili) -->
        <div id="additional-stats" class="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        
        <!-- Miglior Differenza Reti -->
        <div class="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-green-300 uppercase">Miglior Diff. Reti</h4>
            </div>
            ${stats.bestGoalDifference.team ? `
                <div class="flex items-center space-x-3">
                    <img src="${getTeamLogo(stats.bestGoalDifference.team)}" alt="${stats.bestGoalDifference.team}" class="w-10 h-10 object-contain" onerror="this.style.display='none'">
                    <div>
                        <p class="text-lg font-bold text-white">${stats.bestGoalDifference.team}</p>
                        <p class="text-2xl font-bold text-green-400">${stats.bestGoalDifference.goalDifference > 0 ? '+' : ''}${stats.bestGoalDifference.goalDifference}</p>
                    </div>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Peggior Differenza Reti -->
        <div class="bg-gradient-to-br from-red-900/30 to-red-800/20 border border-red-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-red-300 uppercase">Peggior Diff. Reti</h4>
            </div>
            ${stats.worstGoalDifference.team && stats.worstGoalDifference.goalDifference !== Infinity ? `
                <div class="flex items-center space-x-3">
                    <img src="${getTeamLogo(stats.worstGoalDifference.team)}" alt="${stats.worstGoalDifference.team}" class="w-10 h-10 object-contain" onerror="this.style.display='none'">
                    <div>
                        <p class="text-lg font-bold text-white">${stats.worstGoalDifference.team}</p>
                        <p class="text-2xl font-bold text-red-400">${stats.worstGoalDifference.goalDifference}</p>
                    </div>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Punteggio Più Basso -->
        <div class="bg-gradient-to-br from-gray-900/30 to-gray-800/20 border border-gray-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-gray-300 uppercase">Punteggio Più Basso</h4>
            </div>
            ${stats.lowestScore.team && stats.lowestScore.score !== Infinity ? `
                <div class="flex items-center space-x-3">
                    <img src="${getTeamLogo(stats.lowestScore.team)}" alt="${stats.lowestScore.team}" class="w-10 h-10 object-contain" onerror="this.style.display='none'">
                    <div>
                        <p class="text-lg font-bold text-white">${stats.lowestScore.team}</p>
                        <p class="text-2xl font-bold text-gray-400">${stats.lowestScore.score.toFixed(1)} punti</p>
                        <p class="text-xs text-gray-400">vs ${stats.lowestScore.opponent} - Giornata ${stats.lowestScore.giornata}</p>
                    </div>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Pareggio con Punteggio Più Alto -->
        <div class="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-orange-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-orange-300 uppercase">Pareggio Più Alto</h4>
            </div>
            ${stats.highestDraw.homeTeam ? `
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <img src="${getTeamLogo(stats.highestDraw.homeTeam)}" alt="${stats.highestDraw.homeTeam}" class="w-8 h-8 object-contain" onerror="this.style.display='none'">
                        <img src="${getTeamLogo(stats.highestDraw.awayTeam)}" alt="${stats.highestDraw.awayTeam}" class="w-8 h-8 object-contain" onerror="this.style.display='none'">
                    </div>
                    <p class="text-lg font-bold text-white">${stats.highestDraw.homeTeam} vs ${stats.highestDraw.awayTeam}</p>
                    <p class="text-2xl font-bold text-orange-400">${stats.highestDraw.score.toFixed(1)}-${stats.highestDraw.score.toFixed(1)}</p>
                    <p class="text-xs text-gray-400">Giornata ${stats.highestDraw.giornata}</p>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Pareggio con Punteggio Più Basso -->
        <div class="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border border-cyan-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-cyan-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-cyan-300 uppercase">Pareggio Più Basso</h4>
            </div>
            ${stats.lowestDraw.homeTeam && stats.lowestDraw.score !== Infinity ? `
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <img src="${getTeamLogo(stats.lowestDraw.homeTeam)}" alt="${stats.lowestDraw.homeTeam}" class="w-8 h-8 object-contain" onerror="this.style.display='none'">
                        <img src="${getTeamLogo(stats.lowestDraw.awayTeam)}" alt="${stats.lowestDraw.awayTeam}" class="w-8 h-8 object-contain" onerror="this.style.display='none'">
                    </div>
                    <p class="text-lg font-bold text-white">${stats.lowestDraw.homeTeam} vs ${stats.lowestDraw.awayTeam}</p>
                    <p class="text-2xl font-bold text-cyan-400">${stats.lowestDraw.score.toFixed(1)}-${stats.lowestDraw.score.toFixed(1)}</p>
                    <p class="text-xs text-gray-400">Giornata ${stats.lowestDraw.giornata}</p>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Partita con Più Gol -->
        <div class="bg-gradient-to-br from-pink-900/30 to-pink-800/20 border border-pink-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-pink-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-pink-300 uppercase">Partita con Più Gol</h4>
            </div>
            ${stats.mostGoalsMatch.homeTeam ? `
                <div>
                    <div class="flex items-center gap-2 mb-2">
                        <img src="${getTeamLogo(stats.mostGoalsMatch.homeTeam)}" alt="${stats.mostGoalsMatch.homeTeam}" class="w-8 h-8 object-contain" onerror="this.style.display='none'">
                        <img src="${getTeamLogo(stats.mostGoalsMatch.awayTeam)}" alt="${stats.mostGoalsMatch.awayTeam}" class="w-8 h-8 object-contain" onerror="this.style.display='none'">
                    </div>
                    <p class="text-lg font-bold text-white">${stats.mostGoalsMatch.homeTeam} vs ${stats.mostGoalsMatch.awayTeam}</p>
                    <p class="text-2xl font-bold text-pink-400">${stats.mostGoalsMatch.totalGoals} gol totali</p>
                    <p class="text-xs text-gray-400">${stats.mostGoalsMatch.score} - Giornata ${stats.mostGoalsMatch.giornata}</p>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Giornata con Più Gol -->
        <div class="bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 border border-indigo-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-indigo-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-indigo-300 uppercase">Giornata con Più Gol</h4>
            </div>
            ${stats.mostGoalsGiornata.giornata ? `
                <div>
                    <p class="text-lg font-bold text-white">Giornata ${stats.mostGoalsGiornata.giornata}</p>
                    <p class="text-2xl font-bold text-indigo-400">${stats.mostGoalsGiornata.totalGoals} gol totali</p>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        <!-- Giornata con Meno Gol -->
        <div class="bg-gradient-to-br from-teal-900/30 to-teal-800/20 border border-teal-700/50 rounded-lg p-4">
            <div class="flex items-center mb-2">
                <svg class="w-6 h-6 text-teal-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"></path>
                </svg>
                <h4 class="text-sm font-bold text-teal-300 uppercase">Giornata con Meno Gol</h4>
            </div>
            ${stats.leastGoalsGiornata.giornata && stats.leastGoalsGiornata.totalGoals !== Infinity ? `
                <div>
                    <p class="text-lg font-bold text-white">Giornata ${stats.leastGoalsGiornata.giornata}</p>
                    <p class="text-2xl font-bold text-teal-400">${stats.leastGoalsGiornata.totalGoals} gol totali</p>
                </div>
            ` : '<p class="text-gray-400 text-sm">Dati non disponibili</p>'}
        </div>
        
        </div>
    `;
    
};

/**
 * Mostra/nasconde le statistiche aggiuntive
 */
const toggleAdditionalStats = () => {
    const additionalStats = document.getElementById('additional-stats');
    const toggleBtn = document.getElementById('toggle-stats-btn');
    const toggleText = document.getElementById('toggle-stats-text');
    const toggleIcon = document.getElementById('toggle-stats-icon');
    
    if (additionalStats && toggleBtn && toggleText && toggleIcon) {
        if (additionalStats.classList.contains('hidden')) {
            // Mostra
            additionalStats.classList.remove('hidden');
            toggleText.textContent = 'Nascondi statistiche';
            toggleIcon.style.transform = 'rotate(180deg)';
        } else {
            // Nascondi
            additionalStats.classList.add('hidden');
            toggleText.textContent = 'Vedi altre statistiche';
            toggleIcon.style.transform = 'rotate(0deg)';
        }
    }
};

// Esporta le funzioni
window.loadLeagueStatsData = loadLeagueStatsData;
window.renderStatistics = renderStatistics;
window.toggleAdditionalStats = toggleAdditionalStats;
window.initLeagueStats = initLeagueStats;
