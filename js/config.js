/**
 * FANTABet - Configurazioni e Costanti Globali
 * 
 * Questo modulo contiene tutte le configurazioni globali,
 * costanti e mappature utilizzate nell'applicazione.
 */

// ===================================
// CONFIGURAZIONE ADMIN
// ===================================

// Lista admin (fallback vuota). Imposta window.ADMIN_USER_IDS = ['uid1','uid2'] se vuoi preconfigurare admin.
export const ADMIN_USER_IDS = Array.isArray(window.ADMIN_USER_IDS) 
    ? window.ADMIN_USER_IDS 
    : ['zfnVEz13IYZchLxxWTwi6htI5cU2'];

// ===================================
// CONFIGURAZIONE GITHUB (Loghi)
// ===================================

export const GITHUB_USERNAME = 'savinopi';
export const GITHUB_REPO = 'FantaBet2';
export const LOGOS_FOLDER = ''; // I loghi sono nella root del repository
export const GITHUB_LOGOS_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main`;

// ===================================
// MAPPATURA LOGHI SQUADRE
// ===================================

export const TEAM_LOGOS = {
    'Audace Cerignola Next Gen': 'Logo Audace Cerignola.png',
    'Disagiati FC': 'Logo Disagiati FC.png',
    'Friariello FC': 'Logo Friarello FC 2025.png',
    'LIBERTAS': 'Logo Libertas.png',
    'Tarzanelli': 'Logo Tarzanelli.png',
    'FC SANTA CLAUS': 'Logo santa claus.png',
    'Monte Los Angeles Fc': 'MONTE.png',
    'Schalke 104': 'Schalke104_2024.png',
    'A.S. UDINEGRE': 'UDINEGRE.png',
    'Panza Team': 'logo panza team.png'
};

// ===================================
// FUNZIONI HELPER
// ===================================

/**
 * Ottiene l'URL del logo di una squadra
 * @param {string} teamName - Nome della squadra
 * @returns {string} URL del logo o placeholder SVG
 */
export const getTeamLogo = (teamName) => {
    const logoFile = TEAM_LOGOS[teamName];
    if (logoFile) {
        return `${GITHUB_LOGOS_BASE_URL}/${encodeURIComponent(logoFile)}`;
    }
    // Logo placeholder se non trovato
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23374151'/%3E%3Ctext x='25' y='25' font-size='20' text-anchor='middle' dominant-baseline='middle' fill='%239CA3AF'%3E${teamName.charAt(0)}%3C/text%3E%3C/svg%3E`;
};

// ===================================
// CALENDARIO SERIE A
// Mappatura Giornate Fantacalcio → Date Serie A 2025/26
// Il fantacalcio è iniziato alla 3ª giornata di Serie A
// =================================== 

export const SERIE_A_DATES = {
    1: '2025-09-13',   // Giornata Fanta 1 = Serie A 3 (13-15 settembre)
    2: '2025-09-20',   // Giornata Fanta 2 = Serie A 4
    3: '2025-09-27',   // etc.
    4: '2025-10-04',
    5: '2025-10-18',
    6: '2025-10-25',
    7: '2025-11-01',
    8: '2025-11-08',
    9: '2025-11-22',
    10: '2025-11-29',
    11: '2025-12-06',
    12: '2025-12-13',
    13: '2025-12-20',
    14: '2025-12-29',  // Infrasettimanale
    15: '2026-01-05',
    16: '2026-01-12',
    17: '2026-01-19',
    18: '2026-01-26',
    19: '2026-02-02',
    20: '2026-02-09',
    21: '2026-02-16',
    22: '2026-02-23',
    23: '2026-03-02',
    24: '2026-03-09',
    25: '2026-03-16',
    26: '2026-03-23',
    27: '2026-04-06',
    28: '2026-04-13',
    29: '2026-04-20',
    30: '2026-04-27',
    31: '2026-05-04',
    32: '2026-05-11',
    33: '2026-05-18',
    34: '2026-05-25',
    35: '2026-05-31',  // Ultima giornata
    36: '2026-05-31'   // Giornata Fanta 36 = Serie A 38
};

/**
 * Ottiene la data della Serie A per una specifica giornata fantacalcio
 * @param {number} giornataFanta - Numero giornata fantacalcio (1-36)
 * @returns {string} Data in formato YYYY-MM-DD
 */
export const getSerieAMatchDate = (giornataFanta) => {
    return SERIE_A_DATES[giornataFanta] || SERIE_A_DATES[1];
};

// ===================================
// CONFIGURAZIONE CREDITI DEFAULT
// ===================================

export const DEFAULT_USER_CREDITS = 100;

// ===================================
// TIPOLOGIE BONUS
// ===================================

export const BONUS_TYPES = {
    RG: { name: 'Raddoppio Goal', shortName: 'RG', icon: '×2', color: 'red' },
    twoG: { name: 'Assegna 2 Goal', shortName: '2G', icon: '+2', color: 'green' },
    SC: { name: 'Scudo', shortName: 'SC', icon: 'SC', color: 'blue' },
    POTM: { name: 'Player of the Match', shortName: 'POTM', icon: '⭐', color: 'yellow' }
};
