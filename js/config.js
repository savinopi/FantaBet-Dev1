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
export const LOGOS_FOLDER = 'assets'; // I loghi sono nella cartella assets
export const GITHUB_LOGOS_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${GITHUB_REPO}/main/${LOGOS_FOLDER}`;

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
    // Giornata Fantacalcio -> Data (Serie A giornata = Fanta + 2)
    1: '2025-09-13',   // Fanta G.1 = Serie A G.3 (13-14 settembre)
    2: '2025-09-19',   // Fanta G.2 = Serie A G.4 (19-20 settembre)
    3: '2025-09-27',   // Fanta G.3 = Serie A G.5 (27-28 settembre)
    4: '2025-10-03',   // Fanta G.4 = Serie A G.6 (3-4 ottobre)
    5: '2025-10-18',   // Fanta G.5 = Serie A G.7 (18-19 ottobre)
    6: '2025-10-24',   // Fanta G.6 = Serie A G.8 (24-25 ottobre)
    7: '2025-10-28',   // Fanta G.7 = Serie A G.9 (28-29 ottobre)
    8: '2025-11-01',   // Fanta G.8 = Serie A G.10 (1-2 novembre)
    9: '2025-11-07',   // Fanta G.9 = Serie A G.11 (7-8 novembre)
    10: '2025-11-22',  // Fanta G.10 = Serie A G.12 (22-23 novembre)
    11: '2025-11-28',  // Fanta G.11 = Serie A G.13 (28-29 novembre)
    12: '2025-12-06',  // Fanta G.12 = Serie A G.14 (6-7 dicembre)
    13: '2025-12-12',  // Fanta G.13 = Serie A G.15 (12-13 dicembre)
    14: '2025-12-20',  // Fanta G.14 = Serie A G.16 (20-21 dicembre)
    15: '2025-12-27',  // Fanta G.15 = Serie A G.17 (27-28 dicembre)
    16: '2026-01-02',  // Fanta G.16 = Serie A G.18 (2-3 gennaio)
    17: '2026-01-06',  // Fanta G.17 = Serie A G.19 (6-7 gennaio)
    18: '2026-01-10',  // Fanta G.18 = Serie A G.20 (10-11 gennaio)
    19: '2026-01-16',  // Fanta G.19 = Serie A G.21 (16-17 gennaio)
    20: '2026-01-23',  // Fanta G.20 = Serie A G.22 (23-24 gennaio)
    21: '2026-02-01',  // Fanta G.21 = Serie A G.23 (1-2 febbraio)
    22: '2026-02-08',  // Fanta G.22 = Serie A G.24 (8-9 febbraio)
    23: '2026-02-25',  // Fanta G.23 = Serie A G.25 (25-26 febbraio)
    24: '2026-02-22',  // Fanta G.24 = Serie A G.26 (22-23 febbraio)
    25: '2026-03-01',  // Fanta G.25 = Serie A G.27 (1-2 marzo)
    26: '2026-03-08',  // Fanta G.26 = Serie A G.28 (8-9 marzo)
    27: '2026-03-15',  // Fanta G.27 = Serie A G.29 (15-16 marzo)
    28: '2026-03-22',  // Fanta G.28 = Serie A G.30 (22-23 marzo)
    29: '2026-04-04',  // Fanta G.29 = Serie A G.31 (4-5 aprile)
    30: '2026-04-12',  // Fanta G.30 = Serie A G.32 (12-13 aprile)
    31: '2026-04-19',  // Fanta G.31 = Serie A G.33 (19-20 aprile)
    32: '2026-04-26',  // Fanta G.32 = Serie A G.34 (26-27 aprile)
    33: '2026-05-03',  // Fanta G.33 = Serie A G.35 (3-4 maggio)
    34: '2026-05-10',  // Fanta G.34 = Serie A G.36 (10-11 maggio)
    35: '2026-05-17',  // Fanta G.35 = Serie A G.37 (17-18 maggio)
    36: '2026-05-24'   // Fanta G.36 = Serie A G.38 (24-25 maggio)
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
