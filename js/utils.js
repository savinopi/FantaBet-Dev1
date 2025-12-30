/**
 * FANTABet - Funzioni di Utilità
 * 
 * Questo modulo contiene funzioni helper riutilizzabili
 * in tutta l'applicazione.
 */

// ===================================
// GESTIONE MESSAGGI
// ===================================

/**
 * Mostra un messaggio all'utente in una modale
 * @param {string} message - Il messaggio da mostrare
 */
export const messageBox = (message) => {
    const msgBox = document.getElementById('message-box');
    const msgText = document.getElementById('message-text');
    if (msgBox && msgText) {
        msgText.innerHTML = message; // Usa innerHTML per supportare HTML
        msgBox.classList.remove('hidden');
    } else {
        // Fallback se elementi non presenti
        alert(message);
    }
};

/**
 * Nasconde la modale dei messaggi
 */
export const hideMessageBox = () => {
    const msgBox = document.getElementById('message-box');
    if (msgBox) {
        msgBox.classList.add('hidden');
    }
};

// Esponi globalmente per onclick inline
window.messageBox = messageBox;
window.hideMessageBox = hideMessageBox;

// ===================================
// BARRA DI PROGRESSO
// ===================================

let progressStartTime = null;

/**
 * Mostra la barra di progresso
 * @param {string} title - Titolo da mostrare
 */
export const showProgressBar = (title = 'Elaborazione in corso...') => {
    const container = document.getElementById('progress-bar-container');
    const titleEl = document.getElementById('progress-title');
    
    if (container) {
        container.classList.remove('hidden');
        progressStartTime = Date.now();
    }
    if (titleEl) {
        titleEl.textContent = title;
    }
    
    updateProgressBar(0, 'Inizializzazione...');
};

/**
 * Aggiorna la barra di progresso
 * @param {number} percentage - Percentuale completamento (0-100)
 * @param {string} status - Messaggio di stato
 */
export const updateProgressBar = (percentage, status = '') => {
    const fill = document.getElementById('progress-bar-fill');
    const percentageEl = document.getElementById('progress-percentage');
    const statusEl = document.getElementById('progress-status');
    const timeEl = document.getElementById('progress-time');
    
    if (fill) {
        fill.style.width = `${percentage}%`;
    }
    if (percentageEl) {
        percentageEl.textContent = `${Math.round(percentage)}%`;
    }
    if (statusEl && status) {
        statusEl.textContent = status;
    }
    if (timeEl && progressStartTime) {
        const elapsed = Math.round((Date.now() - progressStartTime) / 1000);
        timeEl.textContent = `Tempo trascorso: ${elapsed}s`;
    }
};

/**
 * Nasconde la barra di progresso
 */
export const hideProgressBar = () => {
    const container = document.getElementById('progress-bar-container');
    if (container) {
        container.classList.add('hidden');
    }
    progressStartTime = null;
};

// Esponi globalmente
window.showProgressBar = showProgressBar;
window.updateProgressBar = updateProgressBar;
window.hideProgressBar = hideProgressBar;

// ===================================
// FORMATTAZIONE
// ===================================

/**
 * Formatta un numero con separatore delle migliaia
 * @param {number} num - Numero da formattare
 * @returns {string} Numero formattato
 */
export const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Formatta una data in formato italiano
 * @param {string|Date} date - Data da formattare
 * @returns {string} Data formattata (es: "15 Gen 2025")
 */
export const formatDate = (date) => {
    const d = new Date(date);
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 
                    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Formatta un timestamp in formato data e ora
 * @param {Date|number} timestamp - Timestamp da formattare
 * @returns {string} Data e ora formattate
 */
export const formatDateTime = (timestamp) => {
    const d = new Date(timestamp);
    return d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// ===================================
// VALIDAZIONE
// ===================================

/**
 * Valida un indirizzo email
 * @param {string} email - Email da validare
 * @returns {boolean} true se valida
 */
export const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

/**
 * Valida la lunghezza della password
 * @param {string} password - Password da validare
 * @returns {boolean} true se valida (min 6 caratteri)
 */
export const isValidPassword = (password) => {
    return password && password.length >= 6;
};

// ===================================
// DOM HELPERS
// ===================================

/**
 * Attende che il DOM sia pronto
 * @param {Function} callback - Funzione da eseguire
 */
export const onDOMReady = (callback) => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
};

/**
 * Trova un elemento o ritorna null senza errori
 * @param {string} selector - Selettore CSS
 * @returns {Element|null}
 */
export const $ = (selector) => {
    return document.querySelector(selector);
};

/**
 * Trova tutti gli elementi che matchano un selettore
 * @param {string} selector - Selettore CSS
 * @returns {NodeList}
 */
export const $$ = (selector) => {
    return document.querySelectorAll(selector);
};

// ===================================
// DEBOUNCE & THROTTLE
// ===================================

/**
 * Debounce - ritarda l'esecuzione fino a che non smette di essere chiamata
 * @param {Function} func - Funzione da eseguire
 * @param {number} wait - Millisecondi da attendere
 * @returns {Function}
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Throttle - limita la frequenza di esecuzione
 * @param {Function} func - Funzione da eseguire
 * @param {number} limit - Millisecondi minimo tra esecuzioni
 * @returns {Function}
 */
export const throttle = (func, limit) => {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// ===================================
// LOCAL STORAGE HELPERS
// ===================================

/**
 * Salva un valore nel localStorage
 * @param {string} key - Chiave
 * @param {*} value - Valore (verrà serializzato in JSON)
 */
export const setLocalStorage = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Errore salvataggio localStorage:', e);
    }
};

/**
 * Legge un valore dal localStorage
 * @param {string} key - Chiave
 * @param {*} defaultValue - Valore di default se non trovato
 * @returns {*} Valore deserializzato
 */
export const getLocalStorage = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('Errore lettura localStorage:', e);
        return defaultValue;
    }
};

/**
 * Rimuove un valore dal localStorage
 * @param {string} key - Chiave
 */
export const removeLocalStorage = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Errore rimozione localStorage:', e);
    }
};

// ===================================
// COPY TO CLIPBOARD
// ===================================

/**
 * Copia testo negli appunti
 * @param {string} text - Testo da copiare
 * @returns {Promise<boolean>} true se copiato con successo
 */
export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (e) {
        // Fallback per browser più vecchi
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            return true;
        } catch (e2) {
            console.error('Errore copia negli appunti:', e2);
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
};

// ===================================
// SLEEP/DELAY
// ===================================

/**
 * Attende un certo numero di millisecondi
 * @param {number} ms - Millisecondi da attendere
 * @returns {Promise}
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
