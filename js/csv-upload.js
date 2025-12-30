/**
 * csv-upload.js - Modulo per gestione upload file CSV
 * Calendario campionato, rose, statistiche
 */

import { 
    db,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    setDoc,
    updateDoc,
    getDoc,
    query,
    limit,
    getResultsCollectionRef,
    getMatchesCollectionRef,
    getScheduleCollectionRef,
    getPlayersCollectionRef,
    getSquadsCollectionRef,
    getPlayerStatsCollectionRef,
    getTeamCollectionRef
} from './firebase-config.js';
import { messageBox, showProgressBar, hideProgressBar, updateProgress } from './utils.js';
import { getIsUserAdmin } from './auth.js';
import { getAllTeams, getAllResults, setAllResults } from './state.js';

// Variabili per il contenuto CSV caricato
let localCsvContent = null;
let selectedStatsFile = null;

// Dipendenze esterne da settare
let renderHistoricResults = null;
let processCsvContent = null;
let loadActiveGiornata = null;

/**
 * Imposta le dipendenze esterne
 */
export const setCsvUploadDependencies = (deps) => {
    if (deps.renderHistoricResults) renderHistoricResults = deps.renderHistoricResults;
    if (deps.processCsvContent) processCsvContent = deps.processCsvContent;
    if (deps.loadActiveGiornata) loadActiveGiornata = deps.loadActiveGiornata;
};

// ==================== CALENDARIO CAMPIONATO ====================

/**
 * Apre il dialog per selezionare il file CSV
 */
export const triggerFileInput = () => {
    document.getElementById('csv-file-input').click();
};

/**
 * Gestisce la selezione del file CSV
 */
export const handleFileSelect = () => {
    console.log('handleFileSelect chiamato');
    const fileInput = document.getElementById('csv-file-input');
    console.log('Input file trovato:', !!fileInput);
    
    const file = fileInput?.files[0];
    console.log('File selezionato:', file ? {
        nome: file.name,
        tipo: file.type,
        dimensione: file.size
    } : 'nessun file');
    
    const fileNameDisplay = document.getElementById('file-name-display');
    const uploadButton = document.getElementById('upload-button');
    
    console.log('Elementi UI trovati:', {
        fileNameDisplay: !!fileNameDisplay,
        uploadButton: !!uploadButton
    });

    if (file) {
        if (fileNameDisplay) fileNameDisplay.textContent = file.name;
        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.classList.remove('btn-secondary');
            uploadButton.classList.add('btn-primary');
        }
        console.log('File selezionato correttamente, UI aggiornata');
    } else {
        if (fileNameDisplay) fileNameDisplay.textContent = 'Nessun file selezionato.';
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.classList.add('btn-secondary');
            uploadButton.classList.remove('btn-primary');
        }
        console.log('Nessun file selezionato, UI resettata');
    }
};

/**
 * Conferma il caricamento del file CSV
 */
export const confirmUpload = async () => {
    console.log('confirmUpload chiamato');
    const isUserAdmin = getIsUserAdmin();
    
    if (!isUserAdmin) {
        console.warn('Tentativo di upload da utente non admin');
        messageBox("Solo gli admin possono caricare file.");
        return;
    }

    const fileInput = document.getElementById('csv-file-input');
    const file = fileInput?.files[0];
    
    console.log('Stato file:', {
        inputTrovato: !!fileInput,
        fileTrovato: !!file,
        dettagliFile: file ? {
            nome: file.name,
            tipo: file.type,
            dimensione: file.size
        } : null
    });

    if (!file) {
        messageBox("Seleziona un file prima di caricarlo.");
        return;
    }

    try {
        // Check if data already exists
        console.log('Verifica dati esistenti...');
        const q = query(getResultsCollectionRef(), limit(1));
        const snapshot = await getDocs(q);
        console.log('Snapshot risultati:', {
            vuoto: snapshot.empty,
            numeroDoc: snapshot.size
        });
        
        let confirmationMessage = "Sei sicuro di voler caricare il file? Eventuali dati esistenti verranno sovrascritti.";

        if (snapshot.empty) {
            confirmationMessage = "Sei sicuro di voler procedere con il caricamento del file?";
        }

        console.log('Richiesta conferma utente');
        if (confirm(confirmationMessage)) {
            console.log('Utente ha confermato, avvio processamento');
            processNewFile();
        } else {
            console.log('Utente ha annullato');
        }
    } catch (error) {
        console.error('Errore durante la verifica dei dati esistenti:', error);
        messageBox("Errore durante la verifica dei dati: " + error.message);
    }
};

/**
 * Processa il nuovo file CSV selezionato
 */
export const processNewFile = () => {
    console.log('processNewFile chiamato');
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) {
        console.warn('Utente non admin, caricamento non permesso');
        return;
    }
    
    const fileInput = document.getElementById('csv-file-input');
    console.log('File input trovato:', !!fileInput);
    
    const file = fileInput.files[0];
    console.log('File selezionato:', file ? {
        nome: file.name,
        tipo: file.type,
        dimensione: file.size
    } : 'nessun file');
    
    const fileNameDisplay = document.getElementById('file-name-display');
    console.log('Display elemento trovato:', !!fileNameDisplay);

    if (!file) {
        if (fileNameDisplay) fileNameDisplay.textContent = 'Nessun file selezionato.';
        console.warn('Nessun file selezionato');
        return;
    }

    if (fileNameDisplay) fileNameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = async (e) => {
        console.log('File letto con successo');
        localCsvContent = e.target.result;
        console.log('Contenuto CSV (primi 200 caratteri):', localCsvContent.substring(0, 200));
        try {
            if (processCsvContent) {
                await processCsvContent(localCsvContent);
            } else {
                console.error('processCsvContent non è stato settato');
                messageBox("Errore interno: funzione di processamento non disponibile");
            }
        } catch (error) {
            console.error('Errore durante il processamento del CSV:', error);
            messageBox("Errore durante l'elaborazione del file: " + error.message);
        }
    };
    reader.onerror = (error) => {
        console.error('Errore nella lettura del file:', error);
        messageBox("Errore nella lettura del file: " + error);
    };
    
    console.log('Inizio lettura file...');
    reader.readAsText(file);
};

/**
 * Processa dati caricati da file pre-esistente
 */
export const processUploadedData = async (fileName) => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) return;
    
    // Se non ho ancora caricato localCsvContent dal file picker, 
    // cerco di recuperare il contenuto dal file pre-caricato dell'ambiente
    if (!localCsvContent) {
        if (typeof window.__file_contents !== 'undefined' && window.__file_contents[fileName]) {
            localCsvContent = window.__file_contents[fileName];
        } else {
            messageBox(`Il contenuto del file "${fileName}" non è disponibile per l'auto-caricamento. Carica il file manualmente.`);
            return;
        }
    }
    
    if (processCsvContent) {
        await processCsvContent(localCsvContent);
    }
};

// ==================== ROSE (SQUADS) ====================

/**
 * Apre il dialog per selezionare il file CSV delle rose
 */
export const triggerSquadsFileInput = () => {
    document.getElementById('squads-csv-file-input').click();
};

/**
 * Gestisce la selezione del file CSV delle rose
 */
export const handleSquadsFileSelect = () => {
    const fileInput = document.getElementById('squads-csv-file-input');
    const file = fileInput?.files[0];
    
    const fileNameDisplay = document.getElementById('squads-file-name-display');
    const uploadButton = document.getElementById('upload-squads-button');

    if (file) {
        if (fileNameDisplay) fileNameDisplay.textContent = file.name;
        if (uploadButton) {
            uploadButton.disabled = false;
            uploadButton.classList.remove('btn-secondary');
            uploadButton.classList.add('btn-primary');
        }
    } else {
        if (fileNameDisplay) fileNameDisplay.textContent = 'Nessun file selezionato.';
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.classList.add('btn-secondary');
            uploadButton.classList.remove('btn-primary');
        }
    }
};

/**
 * Conferma il caricamento delle rose
 */
export const confirmSquadsUpload = async () => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) {
        messageBox("Solo gli admin possono caricare le rose.");
        return;
    }

    const fileInput = document.getElementById('squads-csv-file-input');
    const file = fileInput?.files[0];

    if (!file) {
        messageBox("Seleziona un file prima di caricarlo.");
        return;
    }

    if (confirm("Sei sicuro di voler caricare le rose? I dati esistenti verranno sovrascritti.")) {
        processSquadsFile();
    }
};

/**
 * Processa il file CSV delle rose
 */
export const processSquadsFile = async () => {
    const isUserAdmin = getIsUserAdmin();
    if (!isUserAdmin) return;

    const fileInput = document.getElementById('squads-csv-file-input');
    const file = fileInput?.files[0];

    if (!file) {
        messageBox("Nessun file selezionato.");
        return;
    }

    showProgressBar('Caricamento rose in corso...');

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target.result;
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);
            
            if (lines.length === 0) {
                hideProgressBar();
                messageBox("Il file CSV è vuoto.");
                return;
            }

            // Parse CSV: Squadra;Ruolo;Calciatore;Squadra (Serie A);Costo
            const players = [];
            const squads = new Map(); // squadra -> array di giocatori
            
            let processedLines = 0;
            
            for (const line of lines) {
                const columns = line.split(';').map(col => col.trim().replace(/^["']|["']$/g, ''));
                
                // Salta righe vuote o incomplete
                if (columns.length < 5) continue;
                if (!columns[0] || !columns[1] || !columns[2]) continue;
                
                const squadName = columns[0];
                const role = columns[1];
                const playerName = columns[2];
                const serieATeam = columns[3];
                const cost = parseFloat(columns[4]) || 0;
                
                // Salta intestazioni o righe non valide
                if (role === 'Ruolo' || squadName === 'Squadra') continue;
                if (!squadName || squadName.includes('Crediti Residui')) continue;
                
                const playerData = {
                    squadName: squadName,
                    role: role,
                    playerName: playerName,
                    serieATeam: serieATeam,
                    cost: cost
                };
                
                players.push(playerData);
                
                // Raggruppa per squadra
                if (!squads.has(squadName)) {
                    squads.set(squadName, []);
                }
                squads.get(squadName).push(playerData);
                
                processedLines++;
                
                // Aggiorna progress bar
                if (processedLines % 10 === 0) {
                    const progress = Math.min(50, (processedLines / lines.length) * 50);
                    updateProgress(progress, `Processate ${processedLines} righe...`);
                }
            }
            
            console.log('Rose parsate:', { 
                totaleGiocatori: players.length, 
                numeroSquadre: squads.size 
            });
            
            updateProgress(50, 'Salvataggio giocatori in corso...');
            
            // Salva i giocatori in Firestore
            const playersCollection = getPlayersCollectionRef();
            
            // Prima cancella tutti i giocatori esistenti
            const existingPlayersSnapshot = await getDocs(playersCollection);
            const deletePromises = existingPlayersSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            
            updateProgress(60, 'Salvataggio nuovi giocatori...');
            
            // Salva i nuovi giocatori
            let savedCount = 0;
            for (const player of players) {
                await addDoc(playersCollection, player);
                savedCount++;
                
                if (savedCount % 20 === 0) {
                    const progress = 60 + (savedCount / players.length) * 30;
                    updateProgress(progress, `Salvati ${savedCount}/${players.length} giocatori...`);
                }
            }
            
            updateProgress(90, 'Salvataggio informazioni squadre...');
            
            // Salva le informazioni aggregate per squadra
            const squadsCollection = getSquadsCollectionRef();
            
            // Cancella squadre esistenti
            const existingSquadsSnapshot = await getDocs(squadsCollection);
            const deleteSquadsPromises = existingSquadsSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deleteSquadsPromises);
            
            // Salva nuove squadre
            for (const [squadName, squadPlayers] of squads.entries()) {
                const squadData = {
                    name: squadName,
                    playerCount: squadPlayers.length,
                    totalCost: squadPlayers.reduce((sum, p) => sum + p.cost, 0),
                    roles: {
                        P: squadPlayers.filter(p => p.role === 'P').length,
                        D: squadPlayers.filter(p => p.role === 'D').length,
                        C: squadPlayers.filter(p => p.role === 'C').length,
                        A: squadPlayers.filter(p => p.role === 'A').length
                    }
                };
                await addDoc(squadsCollection, squadData);
            }
            
            updateProgress(100, 'Completato!');
            
            // Mostra riepilogo
            renderSquadsData(squads);
            
            hideProgressBar();
            messageBox(`Rose caricate con successo!\n\nSquadre: ${squads.size}\nGiocatori totali: ${players.length}`);
            
        } catch (error) {
            console.error('Errore durante il processamento del file rose:', error);
            hideProgressBar();
            messageBox("Errore durante il caricamento: " + error.message);
        }
    };

    reader.onerror = () => {
        hideProgressBar();
        messageBox("Errore nella lettura del file.");
    };

    reader.readAsText(file, 'UTF-8');
};

/**
 * Renderizza i dati delle rose caricate
 */
const renderSquadsData = (squadsMap) => {
    const container = document.getElementById('squads-data-container');
    if (!container) return;
    
    let html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">';
    
    for (const [squadName, players] of squadsMap.entries()) {
        const totalCost = players.reduce((sum, p) => sum + p.cost, 0);
        const roles = {
            P: players.filter(p => p.role === 'P').length,
            D: players.filter(p => p.role === 'D').length,
            C: players.filter(p => p.role === 'C').length,
            A: players.filter(p => p.role === 'A').length
        };
        
        html += `
            <div class="bg-gray-800 border border-purple-700/50 rounded-lg p-4">
                <h5 class="text-lg font-bold text-purple-400 mb-2">${squadName}</h5>
                <div class="text-sm text-gray-300 space-y-1">
                    <p>Giocatori: <span class="font-bold">${players.length}</span></p>
                    <p>Costo totale: <span class="font-bold text-yellow-400">${totalCost}</span></p>
                    <div class="flex justify-between mt-2 pt-2 border-t border-gray-700">
                        <span>P: ${roles.P}</span>
                        <span>D: ${roles.D}</span>
                        <span>C: ${roles.C}</span>
                        <span>A: ${roles.A}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
};

// ==================== STATISTICHE CALCIATORI ====================

/**
 * Apre il dialog per selezionare il file CSV delle statistiche
 */
export const triggerStatsFileInput = () => {
    document.getElementById('stats-csv-file-input').click();
};

/**
 * Gestisce la selezione del file CSV delle statistiche
 */
export const handleStatsFileSelect = () => {
    const fileInput = document.getElementById('stats-csv-file-input');
    const fileNameDisplay = document.getElementById('stats-file-name-display');
    const uploadButton = document.getElementById('upload-stats-button');
    
    if (fileInput.files.length > 0) {
        selectedStatsFile = fileInput.files[0];
        fileNameDisplay.textContent = selectedStatsFile.name;
        uploadButton.disabled = false;
        uploadButton.classList.remove('btn-secondary');
        uploadButton.classList.add('btn-primary');
    } else {
        selectedStatsFile = null;
        fileNameDisplay.textContent = 'Nessun file selezionato.';
        uploadButton.disabled = true;
        uploadButton.classList.remove('btn-primary');
        uploadButton.classList.add('btn-secondary');
    }
};

/**
 * Conferma il caricamento delle statistiche
 */
export const confirmStatsUpload = () => {
    if (!selectedStatsFile) {
        messageBox('Seleziona un file CSV prima di procedere.');
        return;
    }
    
    if (confirm(`Confermi il caricamento delle statistiche dal file "${selectedStatsFile.name}"?\n\nATTENZIONE: Le statistiche precedenti verranno sovrascritte.`)) {
        processStatsFile();
    }
};

/**
 * Processa il file CSV delle statistiche
 */
export const processStatsFile = async () => {
    if (!selectedStatsFile) {
        messageBox('Nessun file selezionato.');
        return;
    }
    
    const uploadButton = document.getElementById('upload-stats-button');
    uploadButton.disabled = true;
    uploadButton.textContent = 'Caricamento...';
    
    try {
        const text = await selectedStatsFile.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            throw new Error('File CSV vuoto o non valido.');
        }
        
        // Parse delle statistiche
        const stats = [];
        const playersCollection = getPlayersCollectionRef();
        const statsCollection = getPlayerStatsCollectionRef();
        
        // Carica tutte le rose per associare i calciatori alle squadre fantacalcio
        updateProgress(0, 'Caricamento rose...', null, null, 'stats-progress');
        const playersSnapshot = await getDocs(playersCollection);
        const playerToSquadMap = new Map(); // Nome calciatore -> Rosa fantacalcio
        
        playersSnapshot.forEach(doc => {
            const player = doc.data();
            // Chiave: nome calciatore normalizzato
            const normalizedName = player.playerName.trim().toLowerCase();
            playerToSquadMap.set(normalizedName, player.squadName);
        });
        
        console.log(`Rose caricate: ${playerToSquadMap.size} calciatori trovati`);
        
        // Parsing del CSV (salta l'header)
        let validLines = 0;
        let skippedLines = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(';').map(col => col.trim().replace(/^["']|["']$/g, ''));
            
            // Verifica che ci siano abbastanza colonne (17 colonne)
            if (columns.length < 17) {
                console.warn(`Riga ${i} ignorata: colonne insufficienti (${columns.length}/17)`, columns);
                skippedLines++;
                continue;
            }
            
            const playerName = columns[2].trim();
            const normalizedName = playerName.toLowerCase();
            const fantaSquad = playerToSquadMap.get(normalizedName) || 'SVINCOLATI';
            
            const statData = {
                playerId: columns[0],
                role: columns[1],
                playerName: playerName,
                serieATeam: columns[3],
                fantaSquad: fantaSquad,
                pv: parseFloat(columns[4]) || 0,
                mv: parseFloat(columns[5]) || 0,
                fm: parseFloat(columns[6]) || 0,
                gf: parseInt(columns[7]) || 0,
                gs: parseInt(columns[8]) || 0,
                rp: parseInt(columns[9]) || 0,
                rc: parseInt(columns[10]) || 0,
                rPlus: parseInt(columns[11]) || 0,
                rMinus: parseInt(columns[12]) || 0,
                ass: parseInt(columns[13]) || 0,
                amm: parseInt(columns[14]) || 0,
                esp: parseInt(columns[15]) || 0,
                au: parseInt(columns[16]) || 0,
                lastUpdate: new Date().toISOString()
            };
            
            stats.push(statData);
            validLines++;
            
            // Progress update ogni 50 righe
            if (validLines % 50 === 0) {
                const progress = Math.floor((validLines / (lines.length - 1)) * 50);
                updateProgress(progress, `Parsing: ${validLines} calciatori...`, null, null, 'stats-progress');
            }
        }
        
        console.log(`Parsing completato: ${validLines} statistiche valide, ${skippedLines} righe ignorate`);
        updateProgress(50, `Cancellazione statistiche precedenti...`, null, null, 'stats-progress');
        
        // Cancella tutte le statistiche esistenti
        const existingStatsSnapshot = await getDocs(statsCollection);
        const deletePromises = existingStatsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log(`${deletePromises.length} statistiche precedenti cancellate`);
        updateProgress(60, `Salvataggio nuove statistiche...`, null, null, 'stats-progress');
        
        // Salva le nuove statistiche
        for (let i = 0; i < stats.length; i++) {
            await addDoc(statsCollection, stats[i]);
            
            // Progress update ogni 20 salvataggi
            if (i % 20 === 0 || i === stats.length - 1) {
                const progress = 60 + Math.floor((i / stats.length) * 40);
                updateProgress(progress, `Salvate ${i + 1}/${stats.length} statistiche...`, null, null, 'stats-progress');
            }
        }
        
        updateProgress(100, 'Completato!', null, null, 'stats-progress');
        messageBox(`Statistiche caricate con successo! ${validLines} calciatori aggiornati.`);
        
        // Mostra riepilogo
        renderStatsSummary(stats);
        
        // Reset UI
        setTimeout(() => {
            uploadButton.disabled = false;
            uploadButton.textContent = 'Carica Statistiche';
        }, 2000);
        
    } catch (error) {
        console.error('Errore durante il caricamento delle statistiche:', error);
        messageBox('Errore durante il caricamento: ' + error.message);
        uploadButton.disabled = false;
        uploadButton.textContent = 'Carica Statistiche';
    }
};

/**
 * Renderizza il riepilogo delle statistiche caricate
 */
const renderStatsSummary = (stats) => {
    const container = document.getElementById('stats-summary-container');
    if (!container) return;
    
    // Raggruppa per rosa fantacalcio
    const squadStats = new Map();
    stats.forEach(stat => {
        if (!squadStats.has(stat.fantaSquad)) {
            squadStats.set(stat.fantaSquad, []);
        }
        squadStats.get(stat.fantaSquad).push(stat);
    });
    
    let html = '<div class="bg-gray-800 border border-blue-700/50 rounded-lg p-4 mb-4">';
    html += '<h5 class="text-lg font-bold text-blue-400 mb-3">Riepilogo Statistiche Caricate</h5>';
    html += '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">';
    
    // Ordina le squadre alfabeticamente
    const sortedSquads = Array.from(squadStats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for (const [squadName, players] of sortedSquads) {
        const totalPv = players.reduce((sum, p) => sum + p.pv, 0);
        const avgFm = players.length > 0 ? (players.reduce((sum, p) => sum + p.fm, 0) / players.length).toFixed(2) : '0.00';
        
        html += `
            <div class="bg-gray-700 rounded p-3 text-center">
                <p class="text-sm font-bold text-white">${squadName}</p>
                <p class="text-xs text-gray-400 mt-1">${players.length} giocatori</p>
                <p class="text-xs text-blue-300">PV tot: ${totalPv}</p>
                <p class="text-xs text-green-300">FM media: ${avgFm}</p>
            </div>
        `;
    }
    
    html += '</div></div>';
    container.innerHTML = html;
};

// Esporta variabili di stato per accesso esterno
export const getLocalCsvContent = () => localCsvContent;
export const setLocalCsvContent = (content) => { localCsvContent = content; };

// Esporta tutte le funzioni globali
window.triggerFileInput = triggerFileInput;
window.handleFileSelect = handleFileSelect;
window.confirmUpload = confirmUpload;
window.processNewFile = processNewFile;
window.processUploadedData = processUploadedData;
window.triggerSquadsFileInput = triggerSquadsFileInput;
window.handleSquadsFileSelect = handleSquadsFileSelect;
window.confirmSquadsUpload = confirmSquadsUpload;
window.processSquadsFile = processSquadsFile;
window.triggerStatsFileInput = triggerStatsFileInput;
window.handleStatsFileSelect = handleStatsFileSelect;
window.confirmStatsUpload = confirmStatsUpload;
window.processStatsFile = processStatsFile;
