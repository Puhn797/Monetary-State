/**
 * MONETARY STATE - THE TOTAL GLOBAL ECONOMY BUILD V1.2.7
 * Features: Integrated Persistence (Save/Load), Top-Right Time Controller, 
 * Initial Loading Screen, and Territory Markers.
 * FIXED: Load save functionality
 */

let gameState = {
    playerCountry: null,
    selectedCountry: null,
    inGame: false,
    isPaused: false,
    territories: [],
    gameDate: new Date(2026, 0, 1),
    gameSpeed: 1,
    treasury: 0,
    gdp: 0,
    saveData: JSON.parse(localStorage.getItem('monetary_state_save')) || null,
    newsHeadlines: [],
    newsIndex: 0,
    diplomaticRelations: {}, // Store relations with other countries
    happiness: 100, // Citizen happiness gauge (0-100)
    warWith: [] // Countries we're at war with
};

const MAX_TREASURY = 9_000_000_000;

const realWorldData = {
    "United States": 31821,
    "China": 20651,
    "Germany": 5328,
    "India": 4506,
    "Japan": 4464,
    "United Kingdom": 4226,
    "France": 3559,
    "Italy": 2702,
    "Russia": 2509,
    "Canada": 2421,
    "Brazil": 2293,
    "Spain": 2042,
    "Mexico": 2031,
    "Australia": 1948,
    "South Korea": 1937,
    "Turkey" : 1580,
    "Indonesia" : 1550,
    "Netherlands" : 1410,
    "Saudi Arabia" : 1320,
    "Poland" : 1110,
    "Switzerland" : 1070,
    "Taiwan" : 971,
    "Belgium" : 761,
    "Ireland" : 750,
    "Sweden" : 712,
    "Argentina" : 668,
    "Israel" : 666,
    "Singapore" : 606,
    "Austria" : 604,
    "United Arab Emirates" : 601,
    "Thailand": 561,
    "Norway" : 548,
    "Philippines": 533,
    "Bangladesh" : 519,
    "Vietnam": 511,
    "Malaysia": 505,
    "Denmark" : 500,
    "Colombia" : 462,
    "Hong Kong" : 447,
    "Romania" : 445,
    "South Africa" : 444,
    "Czechia" : 417,
    "Pakistan" : 411,
    "Egypt" : 400,
    "Iran" : 376,
    "Portugal" : 365,
    "Chile" : 363,
    "Finland" : 336,
    "Nigeria" : 334,
    "Peru" : 327,
    "Kazakhstan" : 320,
    "Greece" : 305,
    "Algeria" : 285,
    "New Zealand" : 281,
    "Iraq" : 274,
    "Hungary" : 270,
    "Qatar" : 239,
    "Ukraine" : 224,
    "Cuba" : 202,
    "Morocco" : 196,
    "Slovakia" : 168,
    "Kuwait" : 163,
    "Uzbekistan" : 159,
    "Bulgaria" : 142,
    "Kenya" : 141,
    "Dominican Republic" : 138,
    "Ecuador" : 135,
    "Guatemala" : 130,
    "Puerto Rico" : 129,
    "Ethiopia" : 126,
    "Ghana" : 113.49,
    "Croatia" : 113.13,
    "Serbia" : 112,
    "Ivory Coast" : 111,
    "Angola" : 110,
    "Costa Rica" : 109.14,
    "Oman" : 109,
    "Luxembourg" : 108,
    "Lithuania" : 105,
    "Sri Lanka" : 99,
    "Panama" : 96,
    "Tanzania" : 95,
    "Uruguay" : 91.64,
    "Belarus" : 91,
    "DR Congo" : 88,
    "Slovenia" : 86,
    "Azerbaijan" : 80.02,
    "Venezuela" : 80,
    "Turkmenistan" : 77,
    "Uganda" : 72,
    "Cameroon" : 68,
    "Myanmar" : 65,
    "Tunisia" : 60,
    "Jordan" : 59,
    "Bolivia" : 57,
    "Zimbabwe" : 55.43,
    "Macao" : 55,
    "Latvia" : 52,
    "Paraguay" : 51.67,
    "Cambodia" : 51.51,
};

let gdpRanking = [];
let lastTick = performance.now();
let dayAccumulator = 0;
let lastYear = gameState.gameDate.getFullYear();

function renderClock() {
    const el = document.getElementById("game-clock");
    if (!el) return;

    el.innerText = gameState.gameDate
        .toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric"
        })
        .toUpperCase();
}

function buildGdpRanking() {
    gdpRanking = [...gameState.territories]
        .filter(c => typeof c.gdp === "number")
        .sort((a, b) => b.gdp - a.gdp)
        .map((c, index) => ({
            name: c.name.common,
            gdp: c.gdp,
            rank: index < 100 ? index + 1 : "100+"
        }));
}

function getCountryRank(countryName) {
    const entry = gdpRanking.find(c => c.name === countryName);

    if (!entry) return "100+";
    return entry.rank;
}

function restoreTerritoriesGDP(savedList) {
    if (!savedList) return;

    const map = new Map(
        savedList.map(t => [t.name, t.gdp])
    );

    gameState.territories.forEach(c => {
        if (map.has(c.name.common)) {
            c.gdp = map.get(c.name.common);
        }
    });
}

    function getCountryGDP(country) {
    const name = country.name.common;

    if (realWorldData[name] !== undefined) {
        return Math.floor(realWorldData[name] * 1000);
    }

    return Math.floor((country.population / 1_000_000) * 5000);
}

function renderTreasury() {
    const el = document.getElementById('money-display');
    if (!el) return;

    if (gameState.treasury >= MAX_TREASURY) {
        el.innerText = "💰 TREASURY: MAX (≈9 QUADRILLION)";
    } else {
        el.innerText = `💰 TREASURY: ${formatMoney(gameState.treasury)}`;
    }
}

function assignRealGDP() {
    gameState.territories.forEach(c => {
        const name = c.name.common;
        if (realWorldData[name] !== undefined) {
            c.gdp = Math.floor(realWorldData[name] * 1000); 
        } else {
            c.gdp = Math.floor((c.population / 1_000_000) * 5000);
        }
    });
}

function calculateStartingTreasury(gdp, rank) {
    // Base treasury is a percentage of GDP
    // Higher-ranked countries get better starting reserves
    
    let treasuryMultiplier;
    
    if (rank <= 5) {
        // Top 5: 40-50% of GDP (super powers)
        treasuryMultiplier = 0.40 + (6 - rank) * 0.02;
    } else if (rank <= 10) {
        // Top 10: 30-40% of GDP (major powers)
        treasuryMultiplier = 0.30 + (11 - rank) * 0.01;
    } else if (rank <= 20) {
        // Top 20: 25-30% of GDP (strong economies)
        treasuryMultiplier = 0.25 + (21 - rank) * 0.005;
    } else if (rank <= 50) {
        // Top 50: 15-25% of GDP (developed economies)
        treasuryMultiplier = 0.15 + (51 - rank) * 0.003;
    } else if (rank <= 100) {
        // Top 100: 8-15% of GDP (developing economies)
        treasuryMultiplier = 0.08 + (101 - rank) * 0.0014;
    } else {
        // Below 100: 5-8% of GDP (smaller economies)
        treasuryMultiplier = 0.05 + Math.random() * 0.03;
    }
    
    return Math.floor(gdp * treasuryMultiplier);
}

function selectLocation(data) {
    // Block Antarctica completely
    if (data.name.common === "Antarctica") {
        console.warn("Antarctica is not selectable");
        return;
    }
    
    if (!gameState.territories.includes(data)) {
        console.warn("Selected country not from territories array");
    }
    
    gameState.selectedCountry = data;
    
    if (typeof data.gdp !== "number" || data.gdp <= 0) {
        data.gdp = getCountryGDP(data);
    }
    
    gameState.gdp = data.gdp;
    
    // Calculate starting treasury based on GDP and rank
    buildGdpRanking();
    const rank = getCountryRank(data.name.common);
    const numericRank = typeof rank === 'number' ? rank : 100;
    
    gameState.treasury = calculateStartingTreasury(gameState.gdp, numericRank);
    renderTreasury();
        
    document.getElementById('country-name-small').innerText =
        data.name.common.toUpperCase();

    document.getElementById('country-flag').src =
        `https://flagcdn.com/w160/${data.cca2.toLowerCase()}.png`;

    document.getElementById('rank-display').innerText =
        `🏆 GDP RANK: #${rank}`;

    document.getElementById('pop-display').innerText =
        `👥 Pop: ${data.population.toLocaleString()}`;

    const coords = projection([data.latlng[1], data.latlng[0]]);
    svg.transition()
        .duration(1000)
        .call(
            zoom.transform,
            d3.zoomIdentity
                .translate(window.innerWidth / 2, window.innerHeight / 2)
                .scale(6)
                .translate(-coords[0], -coords[1])
        );
}

function addResource(name) {
    document.getElementById("resources-list")
        .insertAdjacentHTML(
            "beforeend",
            `<div class="item">${name}</div>`
        );
}

function addToTreasury(amount) {
    gameState.treasury = Math.min(
        gameState.treasury + amount,
        MAX_TREASURY
    );
}

function tick() {
    try {
        const now = performance.now();
        const delta = now - lastTick;
        lastTick = now;
        
        // Debug logging for time issues
        if (delta > 5000) {
            console.warn("Large time gap detected:", delta, "ms");
            console.log("Game state:", {
                inGame: gameState.inGame,
                isPaused: gameState.isPaused,
                gameSpeed: gameState.gameSpeed
            });
        }
        
        if (!gameState.inGame || gameState.isPaused) {
            // Don't accumulate time when paused
            return;
        }
        
        dayAccumulator += (delta / 1000) * gameState.gameSpeed;

        while (dayAccumulator >= 1) {
            gameState.gameDate.setDate(
                gameState.gameDate.getDate() + 1
            );
            dayAccumulator--;

            const clockEl = document.getElementById("game-clock");
            if (clockEl) {
                clockEl.innerText = gameState.gameDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric"
                }).toUpperCase();
            }

            const currentYear = gameState.gameDate.getFullYear();

           if (currentYear !== lastYear) {
        lastYear = currentYear;

        const growth = Math.floor(gameState.gdp * 0.03);
        gameState.gdp += growth;

        if (gameState.selectedCountry) {
            gameState.selectedCountry.gdp = gameState.gdp;
        }

        gameState.territories.forEach(c => {
            if (c !== gameState.selectedCountry && typeof c.gdp === "number") {
                c.gdp += Math.floor(c.gdp * 0.015);
            }
        });

        const gdpIncome = Math.floor(gameState.gdp * 0.02);
        addToTreasury(gdpIncome);
        
        // Update happiness based on various factors
        updateHappiness();
        
        // Check for game over
        if (gameState.happiness <= 0) {
            triggerGameOver();
            return; // Stop further processing
        }
        
        buildGdpRanking();

        updateHud();
        renderTreasury();

        updateEconomy();
        renderEconomyUI();
        
        // Generate news based on actual game events
        if (gameState.inGame && gameState.selectedCountry) {
            const growthPercent = ((growth / (gameState.gdp - growth)) * 100).toFixed(1);
            const newsEvent = `📊 ${gameState.selectedCountry.name.common} GDP grows ${growthPercent}% - Annual income: ${formatMoney(gdpIncome)}`;
            gameState.newsHeadlines.push(newsEvent);
            if (gameState.newsHeadlines.length > 20) {
                gameState.newsHeadlines.shift();
            }
        }
            }
        }
    } catch (error) {
        console.error("ERROR in tick function:", error);
        console.error("Stack trace:", error.stack);
        console.log("Game state at error:", {
            inGame: gameState.inGame,
            isPaused: gameState.isPaused,
            gameDate: gameState.gameDate,
            lastYear: lastYear,
            dayAccumulator: dayAccumulator,
            selectedCountry: gameState.selectedCountry?.name.common
        });
        // Don't stop the game loop, but pause to prevent cascading errors
        gameState.isPaused = true;
        alert("An error occurred in the game. The game has been paused. Check the console (F12) for details.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const saveWindow = document.getElementById("save-window");
    console.log("DOMContentLoaded - saveWindow:", saveWindow);
    console.log("DOMContentLoaded - saveData:", gameState.saveData);

    if (gameState.saveData && saveWindow) {

        saveWindow.style.display = "block";

        document.getElementById("save-country").textContent =
            gameState.saveData.countryName;

        // Show the real-world date/time when the game was saved
        if (gameState.saveData.lastSaved) {
            const realSaveTime = new Date(gameState.saveData.lastSaved);
            
            document.getElementById("save-date").textContent =
                realSaveTime.toLocaleString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                });
        }

        const loadBtn = document.getElementById("load-save-btn");
        console.log("Load button element:", loadBtn);
        
        if (loadBtn) {
            // Remove any existing listeners
            loadBtn.onclick = null;
            
            // Add new listener
            loadBtn.addEventListener('click', function(e) {
                console.log("Load button clicked!");
                e.preventDefault();
                e.stopPropagation();
                saveWindow.style.display = "none";
                startSimulation(true);
            });
            
            console.log("Load button listener attached");
        } else {
            console.error("Load button not found!");
        }
    }
});

const economyState = {
    inflation: 2,
    unemployment: 3,

    resources: {
        "Natural Gas & Oil": ["Natural Gas", "Oil", "Coal"],
        "Minerals & Ores": [
            "Lithium", "Cobalt", "Nickel", "Graphite", "Rare-earth",
            "Iron", "Copper", "Aluminum", "Manganese", "Quartz",
            "Potash", "Phosphorus", "Sulfur", "Gold", "Silver",
            "Platinum", "Silicon", "Tantalum", "Tellurium",
            "Diamond", "Uranium"
        ],
        "Non-metal": [
            "Sand", "Gravel", "Limestone", "Clay", "Gypsum",
            "Marble", "Granite", "Salt", "Carbon"
        ],
        "Agriculture": ["Water", "Vegetation", "Meat"],
        "Labor": ["Male (Adult)", "Female (Adult)", "Children"],
        "Supply": ["Electricity", "Water", "Waste"]
    },

    values: {}
};

// ============== NEWS TICKER SYSTEM ==============
const newsTemplates = {
    economic: [
        "💹 {country} GDP grows {percent}% this quarter",
        "📊 {country} reports {trend} economic indicators",
        "💼 {country} unemployment rate {direction} to {percent}%",
        "🏦 Central Bank of {country} adjusts interest rates",
        "💰 {country} treasury reserves reach ${amount}B",
        "📈 {country} stock market hits {trend} levels",
        "🏭 Manufacturing sector in {country} shows {trend} growth",
        "💱 {country} currency {direction} against major indices",
        "📉 {country} inflation drops to {percent}%",
        "💵 {country} foreign investment surges {percent}%"
    ],
    trade: [
        "🌐 {country} signs major trade deal with {partner}",
        "📦 {country} exports surge by {percent}%",
        "🚢 {country} opens new trade routes",
        "🤝 {country} strengthens economic ties with {partner}",
        "⚖️ {country} renegotiates trade agreements",
        "🛫 {country}-{partner} trade volume hits record high",
        "🔄 {country} diversifies trade partnerships",
        "📊 {country} trade surplus reaches ${amount}B"
    ],
    resources: [
        "⛽ {resource} prices {direction} in {country}",
        "⚡ {country} boosts {resource} production by {percent}%",
        "💎 Major {resource} reserves discovered in {country}",
        "🏗️ {country} invests in {resource} infrastructure",
        "♻️ {country} focuses on sustainable {resource} management",
        "🌾 {country} becomes leading {resource} exporter",
        "⚒️ {country} mining sector expands {percent}%"
    ],
    global: [
        "🌍 Global markets react to {country} policy changes",
        "🗳️ {country} announces major economic reforms",
        "🏛️ {country} leaders meet for economic summit",
        "📢 {country} unveils {amount}B stimulus package",
        "🎯 {country} sets ambitious {year} growth targets",
        "🌏 {country} joins international economic alliance",
        "🔔 {country} hosts global finance conference"
    ],
    technology: [
        "🚀 {country} leads in tech innovation index",
        "💻 {country} invests ${amount}B in digital infrastructure",
        "🤖 AI sector booms in {country}",
        "📱 {country} becomes tech manufacturing hub",
        "🔬 {country} breakthrough in renewable technology",
        "⚙️ {country} launches national tech initiative"
    ],
    international: [
        "🌐 {country} and {partner} strengthen bilateral ties",
        "✈️ {country} tourism from {partner} increases {percent}%",
        "🎓 {country}-{partner} education exchange program expands",
        "🏥 {country} provides aid to {partner}",
        "🤝 {country} and {partner} collaborate on infrastructure",
        "📡 {country} partners with {partner} on technology",
        "🌍 {country} delegation visits {partner}",
        "💼 {country} businesses expand into {partner} market"
    ],
    markets: [
        "📈 {country} attracts ${amount}B in foreign investment",
        "🏢 Major corporations relocate to {country}",
        "💹 {country} bond market shows {trend} performance",
        "🎲 {country} financial sector reforms implemented",
        "💎 {country} luxury goods market grows {percent}%",
        "🏪 {country} retail sales surge by {percent}%"
    ]
};

function generateNews() {
    if (!gameState.selectedCountry || gameState.territories.length === 0) return "Loading global economic data...";
    
    // 60% chance for player's country, 40% chance for another country
    const usePlayerCountry = Math.random() < 0.6;
    
    let country;
    if (usePlayerCountry) {
        country = gameState.selectedCountry.name.common;
    } else {
        // Pick a random other country (excluding Antarctica and player country)
        const otherCountries = gameState.territories
            .filter(t => 
                t.name.common !== "Antarctica" && 
                t.name.common !== gameState.selectedCountry.name.common &&
                t.gdp && t.gdp > 100000 // Only show countries with reasonable GDP
            );
        
        if (otherCountries.length > 0) {
            // Favor top 50 countries for more relevant news
            const topCountries = [...otherCountries]
                .sort((a, b) => b.gdp - a.gdp)
                .slice(0, 50);
            
            const selectedCountry = topCountries[Math.floor(Math.random() * topCountries.length)];
            country = selectedCountry.name.common;
        } else {
            country = gameState.selectedCountry.name.common;
        }
    }
    
    const categories = Object.keys(newsTemplates);
    const category = categories[Math.floor(Math.random() * categories.length)];
    const templates = newsTemplates[category];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Generate random values
    const percent = (Math.random() * 5 + 0.5).toFixed(1);
    const amount = (Math.random() * 500 + 50).toFixed(0);
    const year = gameState.gameDate.getFullYear();
    
    const trends = ["strong", "positive", "stable", "robust", "promising"];
    const directions = ["rises", "increases", "improves", "strengthens"];
    const trend = trends[Math.floor(Math.random() * trends.length)];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    // Get random partner country (different from the main country)
    const partners = gameState.territories
        .filter(t => 
            t.name.common !== country && 
            t.name.common !== "Antarctica" &&
            t.gdp && t.gdp > 100000
        )
        .sort((a, b) => b.gdp - a.gdp)
        .slice(0, 30);
    const partner = partners[Math.floor(Math.random() * partners.length)]?.name.common || "Global Partners";
    
    // Get random resource (exclude Labor category for trade news)
    const resourceCategories = Object.keys(economyState.resources).filter(cat => cat !== "Labor");
    const resourceCategory = resourceCategories[Math.floor(Math.random() * resourceCategories.length)];
    const resources = economyState.resources[resourceCategory];
    const resource = resources[Math.floor(Math.random() * resources.length)];
    
    // Replace placeholders
    let news = template
        .replace(/{country}/g, country)
        .replace(/{percent}/g, percent)
        .replace(/{amount}/g, amount)
        .replace(/{trend}/g, trend)
        .replace(/{direction}/g, direction)
        .replace(/{partner}/g, partner)
        .replace(/{resource}/g, resource)
        .replace(/{year}/g, year);
    
    return news;
}

function initNewsSystem() {
    // Use the existing news-window from HTML
    const newsWindow = document.getElementById('news-window');
    const newsContent = document.getElementById('news-content');
    
    if (newsWindow && newsContent) {
        newsWindow.style.display = 'block';
        
        // Set initial text
        newsContent.textContent = "Economic systems initializing...";
        newsContent.style.animation = 'scrollNews 15s linear infinite';
    }
    
    // Generate initial headlines
    gameState.newsHeadlines = [];
    for (let i = 0; i < 10; i++) {
        gameState.newsHeadlines.push(generateNews());
    }
    
    // Start ticker animation after a short delay
    setTimeout(() => {
        updateNewsTicker();
    }, 2000);
}

function addNewsTickerStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #news-ticker {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: linear-gradient(180deg, rgba(0, 255, 65, 0.15) 0%, rgba(0, 20, 5, 0.95) 100%);
            border-bottom: 2px solid #00ff41;
            box-shadow: 0 4px 20px rgba(0, 255, 65, 0.3);
            z-index: 9999;
            overflow: hidden;
            font-family: 'Courier New', monospace;
            backdrop-filter: blur(10px);
        }
        
        .news-ticker-container {
            display: flex;
            align-items: center;
            height: 100%;
            gap: 15px;
        }
        
        .news-label {
            background: #00ff41;
            color: #000;
            padding: 0 15px;
            height: 100%;
            display: flex;
            align-items: center;
            font-weight: bold;
            font-size: 14px;
            letter-spacing: 2px;
            text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
            flex-shrink: 0;
            animation: pulse-label 2s ease-in-out infinite;
        }
        
        @keyframes pulse-label {
            0%, 100% { background: #00ff41; }
            50% { background: #00dd35; }
        }
        
        .news-content {
            flex: 1;
            overflow: hidden;
            position: relative;
            height: 100%;
        }
        
        .news-text {
            color: #00ff41;
            font-size: 16px;
            white-space: nowrap;
            display: inline-block;
            padding-left: 100%;
            animation: scroll-news 30s linear infinite;
            line-height: 40px;
            text-shadow: 0 0 10px rgba(0, 255, 65, 0.8);
            letter-spacing: 0.5px;
        }
        
        @keyframes scroll-news {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
        }
        
        .news-text:hover {
            animation-play-state: paused;
            color: #00ffff;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.9);
        }
        
        /* Adjust game elements to account for news ticker */
        #tactical-hud {
            top: 50px !important;
        }
        
        #temporal-engine {
            top: 50px !important;
        }
    `;
    document.head.appendChild(style);
}

function updateNewsTicker() {
    const newsContent = document.getElementById('news-content');
    if (!newsContent || !gameState.inGame) return;
    
    if (gameState.newsHeadlines.length === 0) return;
    
    // Get current headline
    const headline = gameState.newsHeadlines[gameState.newsIndex];
    
    // Add fade out animation
    newsContent.style.animation = 'fadeOut 0.5s ease-out';
    
    setTimeout(() => {
        newsContent.textContent = headline;
        // Add scroll animation
        newsContent.style.animation = 'scrollNews 20s linear infinite';
    }, 500);
    
    // Move to next headline
    gameState.newsIndex = (gameState.newsIndex + 1) % gameState.newsHeadlines.length;
    
    // Generate new headline occasionally
    if (Math.random() < 0.3) {
        const newHeadline = generateNews();
        gameState.newsHeadlines.push(newHeadline);
        if (gameState.newsHeadlines.length > 20) {
            gameState.newsHeadlines.shift();
        }
    }
}

// Update news every 30 seconds
setInterval(() => {
    if (gameState.inGame && !gameState.isPaused) {
        updateNewsTicker();
    }
}, 30000);
// ============== END NEWS TICKER SYSTEM ==============


function initEconomy() {
    for (const category in economyState.resources) {
        const items = economyState.resources[category];
        const count = items.length;

        economyState.values[category] = {};

        // Special handling for Supply category
        if (category === "Supply") {
            items.forEach((item) => {
                if (item === "Electricity" || item === "Water") {
                    // Electricity and Water start at 100%
                    economyState.values[category][item] = {
                        percent: 100,
                        change: 0  // Start at 0, not random
                    };
                } else if (item === "Waste") {
                    // Waste is randomized between 1-100%
                    economyState.values[category][item] = {
                        percent: Math.floor(Math.random() * 100) + 1,
                        change: 0  // Start at 0, not random
                    };
                }
            });
            continue; // Skip normal processing for Supply
        }

        // Normal processing for other categories
        // Generate random percentages that add up to 100%
        const randomValues = [];
        let total = 0;
        
        // Generate random numbers for each item
        for (let i = 0; i < count; i++) {
            const randomVal = Math.random() * 100;
            randomValues.push(randomVal);
            total += randomVal;
        }
        
        // Normalize to make them add up to 100%
        items.forEach((item, index) => {
            const normalizedPercent = Math.round((randomValues[index] / total) * 100);
            
            economyState.values[category][item] = {
                percent: normalizedPercent,
                change: 0  // Start at 0, not random
            };
        });
        
        // Ensure total is exactly 100% by adjusting the first item if needed
        let currentTotal = 0;
        items.forEach(item => {
            currentTotal += economyState.values[category][item].percent;
        });
        
        if (currentTotal !== 100) {
            const firstItem = items[0];
            economyState.values[category][firstItem].percent += (100 - currentTotal);
        }
    }
}

function randomDelta() {
    const r = Math.floor(Math.random() * 3) - 1;
    return r;
}

function randomChange(category) {
    let change = Math.floor(Math.random() * 11) - 5;

    if (category === "Supply") {
        return change;
    }

    return change;
}

function generateCategoryValues(items) {
    let remaining = 100;
    const result = {};

    items.forEach((item, i) => {
        if (i === items.length - 1) {
            result[item] = remaining;
        } else {
            const val = Math.floor(Math.random() * (remaining + 1));
            result[item] = val;
            remaining -= val;
        }
    });

    return result;
}

function updateEconomy() {
    for (const category in economyState.values) {
        // Special handling for Supply - no normalization needed
        if (category === "Supply") {
            // Update each item independently (no total = 100% constraint)
            for (const item in economyState.values[category]) {
                const data = economyState.values[category][item];
                const delta = randomDelta();

                data.change = delta;
                data.percent += delta;

                // Keep within bounds
                if (data.percent < 0) data.percent = 0;
                if (data.percent > 100) data.percent = 100;
            }
            continue; // Skip normalization for Supply
        }

        // Normal processing for other categories
        // Update each item's percentage
        for (const item in economyState.values[category]) {
            const data = economyState.values[category][item];
            const delta = randomDelta();

            data.change = delta;
            data.percent += delta;

            // Prevent negative values
            if (data.percent < 1) data.percent = 1;
        }

        // Normalize to make total equal 100%
        let total = 0;
        for (const item in economyState.values[category]) {
            total += economyState.values[category][item].percent;
        }

        // Scale all percentages to sum to 100
        let normalizedTotal = 0;
        const items = Object.keys(economyState.values[category]);
        
        items.forEach((item, index) => {
            if (index < items.length - 1) {
                economyState.values[category][item].percent =
                    Math.round((economyState.values[category][item].percent / total) * 100);
                normalizedTotal += economyState.values[category][item].percent;
            }
        });
        
        // Last item gets remainder to ensure exactly 100%
        const lastItem = items[items.length - 1];
        economyState.values[category][lastItem].percent = 100 - normalizedTotal;
    }

    renderEconomyUI();
}

function renderEconomyUI() {
    try {
        const container = document.getElementById("scroll-engine");
        if (!container) {
            console.error("scroll-engine container not found");
            return;
        }

        // Clear only the resources content, not the entire container
        // First, remove all existing category sections
        const oldSections = container.querySelectorAll('.category-section');
        oldSections.forEach(section => section.remove());
        
        // Remove the RESOURCES header if it exists
        const oldHeaders = container.querySelectorAll('.cat-head');
        oldHeaders.forEach(header => header.remove());

        // Create the RESOURCES header
        const resourcesHeader = document.createElement("h3");
        resourcesHeader.className = "cat-head";
        resourcesHeader.innerText = "RESOURCES:";
        
        // Insert at the beginning
        const closeBtn = container.querySelector('.big-neon-btn');
        if (closeBtn) {
            container.insertBefore(resourcesHeader, closeBtn);
        } else {
            container.appendChild(resourcesHeader);
        }

        for (const category in economyState.values) {
            const section = document.createElement("div");
            section.className = "category-section";

            const title = document.createElement("h3");
            title.className = "cat-head";
            title.innerText = category.toUpperCase();

            const list = document.createElement("ul");
            list.className = "res-list";

            for (const item in economyState.values[category]) {
                const data = economyState.values[category][item];

                let color = "#aaa";
                
                // Special case: Waste has inverted colors (red = bad/increase, green = good/decrease)
                if (item === "Waste") {
                    if (data.change > 0) color = "#ff4444"; // Red when waste increases (bad)
                    if (data.change < 0) color = "#00ff41"; // Green when waste decreases (good)
                } else {
                    // Normal resources: green = good/increase, red = bad/decrease
                    if (data.change > 0) color = "#00ff41";
                    if (data.change < 0) color = "#ff4444";
                }

                const li = document.createElement("li");
                li.innerHTML = `
                    ${item}: ${data.percent}% 
                    <span style="color:${color}">
                        (${data.change > 0 ? "+" : ""}${data.change}%)
                    </span>
                `;
                list.appendChild(li);
            }

            section.appendChild(title);
            section.appendChild(list);
            
            // Insert before the close button (which should be last)
            if (closeBtn) {
                container.insertBefore(section, closeBtn);
            } else {
                container.appendChild(section);
            }
        }
        
        console.log("Economy UI rendered successfully");
    } catch (error) {
        console.error("Error in renderEconomyUI:", error);
    }
}

function formatMoney(value) {

    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)} Trillion`;
    }
    if (value >= 1_000) {
        return `$${(value / 1_000).toFixed(2)} Billion`;
    }
    if (value >= 1) {
        return `$${value.toFixed(2)} Million`;
    }

    return `$${value.toFixed(2)} Million`;
}

const sortedList = Object.keys(realWorldData).sort((a,b) => realWorldData[b] - realWorldData[a]);

let g, projection, path, svg, zoom;

function beginGame() {
    gameState.inGame = true;
    gameState.isPaused = false;

    lastTick = performance.now();
    dayAccumulator = 0;
    lastYear = gameState.gameDate.getFullYear();

    renderClock();
    renderTreasury();
}

async function startSimulation(isLoad) {
    console.log("startSimulation called with isLoad:", isLoad);
    console.log("saveData:", gameState.saveData);
    
    gameState.inGame = false;
    const overlay = document.getElementById('loading-overlay');
    const barFill = document.getElementById('loading-bar-fill');
    
    const menuScreen = document.getElementById('menu-screen');
    if (menuScreen) menuScreen.style.display = 'none';
    
    document.getElementById('viewport').style.display = 'block';
    
    if (overlay) overlay.style.display = 'flex';
    if (barFill) barFill.style.width = "10%";

    if (!svg) {
        console.log("Initializing map...");
        svg = d3.select("#viewport").append("svg").attr("width", window.innerWidth).attr("height", window.innerHeight);
        g = svg.append("g");
        zoom = d3.zoom().scaleExtent([1, 15]).on("zoom", (e) => g.attr("transform", e.transform));
        svg.call(zoom);
        projection = d3.geoMercator().scale(window.innerWidth / 6.5).translate([window.innerWidth / 2,window.innerHeight * 0.5
    ]);
        path = d3.geoPath().projection(projection);

        if (barFill) barFill.style.width = "40%";
        
        console.log("Loading world data...");
        const world = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
        const resp = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,cca2,population');

        gameState.territories = await resp.json();
        console.log("Territories loaded:", gameState.territories.length);

        if (!isLoad) {
            console.log("Assigning real GDP for new game");
            assignRealGDP();
        } else if (gameState.saveData?.territoriesGDP) {
            console.log("Restoring GDP from save");
            restoreTerritoriesGDP(gameState.saveData.territoriesGDP);
        } else {
            console.log("No save GDP data, using real GDP");
            assignRealGDP();
        }

        buildGdpRanking();

        if (barFill) barFill.style.width = "70%";
        
        // Draw land paths first (lower layer)
        g.selectAll("path").data(world.features).enter().append("path").attr("d", path)
            .attr("class", d => d.properties.name === "Antarctica" ? "land antarctica" : "land")
            .on("click", (e, d) => {
                // Block Antarctica completely
                if(d.properties.name === "Antarctica") {
                    e.stopPropagation();
                    return;
                }
                
                // Try to find matching country
                const mapName = d.properties.name;
                const nameMap = {
                    "USA": "United States",
                    "United States of America": "United States",
                    "Russia": "Russia",
                    "Tanzania": "Tanzania"
                };
                
                const searchName = nameMap[mapName] || mapName;
                const c = gameState.territories.find(t => 
                    t.name.common === searchName || 
                    t.name.official === searchName
                );
                
                if(c) {
                    console.log("Selected from map:", c.name.common);
                    
                    if (gameState.inGame) {
                        // In-game: show country info window
                        showCountryInfo(c);
                    } else {
                        // Pre-game: select country to play as
                        selectLocation(c);
                    }
                }
            });

        // Draw territory pins on top (higher layer) with better visibility
        g.selectAll("circle")
            .data(gameState.territories.filter(d => {
                // Filter out territories without valid coordinates
                if (!d.latlng || d.latlng.length !== 2) return false;
                // Filter out Antarctica explicitly
                if (d.name.common === "Antarctica") return false;
                return true;
            }))
            .enter()
            .append("circle")
            .attr("cx", d => projection([d.latlng[1], d.latlng[0]])[0])
            .attr("cy", d => projection([d.latlng[1], d.latlng[0]])[1])
            .attr("r", 3)
            .attr("class", "territory-pin")
            .on("click", (e, d) => { 
                e.stopPropagation(); 
                e.preventDefault();
                
                // Double check not Antarctica
                if (d.name.common === "Antarctica") {
                    console.log("Blocked Antarctica click");
                    return;
                }
                
                console.log("Selected from pin:", d.name.common);
                
                if (gameState.inGame) {
                    // In-game: show country info window
                    showCountryInfo(d);
                } else {
                    // Pre-game: select country to play as
                    selectLocation(d);
                }
            });
    }

setTimeout(() => {
    if (barFill) barFill.style.width = "100%";
    if (overlay) overlay.style.display = 'none';
    document.getElementById('viewport').style.display = 'block';

    lastTick = performance.now();
    dayAccumulator = 0;

    if (isLoad && gameState.saveData) {
        console.log("Loading saved game for:", gameState.saveData.countryName);
        
        gameState.gameDate = new Date(gameState.saveData.date);
        lastYear = gameState.gameDate.getFullYear();
        
        initEconomy();
        renderEconomyUI();
        
        gameState.selectedCountry = gameState.territories.find(
            c => c.name.common === gameState.saveData.countryName
        );

        if (!gameState.selectedCountry) {
            console.warn("Saved country not found in territories");
            alert("Could not find saved country. Starting new game.");
            randomizeJump();
            document.getElementById('tactical-hud').style.display = 'block';
            const manageBtn = document.getElementById('main-action-btn');
            manageBtn.innerText = "ENTER STATE";
            manageBtn.style.display = 'block';
            return;
        }

        console.log("Found saved country:", gameState.selectedCountry.name.common);
        
        gameState.gdp = gameState.saveData.gdp;
        gameState.treasury = gameState.saveData.treasury;
        gameState.selectedCountry.gdp = gameState.gdp;
        
        // Build GDP ranking first
        buildGdpRanking();
        const rank = getCountryRank(gameState.selectedCountry.name.common);
        
        // Update HUD without changing treasury
        document.getElementById('country-name-small').innerText =
            gameState.selectedCountry.name.common.toUpperCase();

        document.getElementById('country-flag').src =
            `https://flagcdn.com/w160/${gameState.selectedCountry.cca2.toLowerCase()}.png`;

        document.getElementById('rank-display').innerText =
            `🏆 GDP RANK: #${rank}`;

        document.getElementById('pop-display').innerText =
            `👥 Pop: ${gameState.selectedCountry.population.toLocaleString()}`;
        
        renderTreasury();

        document.getElementById('tactical-hud').style.display = 'block';
        document.getElementById('temporal-engine').style.display = 'block';
        
        // Move country panel down when in game
        const leftWingStack = document.getElementById('left-wing-stack');
        if (leftWingStack) {
            leftWingStack.classList.add('in-game');
        }
        
        renderClock();
        
        // Initialize happiness from save or default to 100
        if (typeof gameState.saveData.happiness !== 'undefined') {
            gameState.happiness = gameState.saveData.happiness;
        } else {
            gameState.happiness = 100;
        }
        
        // Initialize war state from save or default to empty
        if (gameState.saveData.warWith) {
            gameState.warWith = gameState.saveData.warWith;
        } else {
            gameState.warWith = [];
        }
        
        renderHappiness();
        
        // Set game as active AFTER everything is set up
        gameState.inGame = true;
        gameState.isPaused = false;
        
        // CRITICAL: Reset time tracking AFTER setting inGame
        lastTick = performance.now();
        dayAccumulator = 0;
        
        console.log("Load save - Time reset:", {
            gameDate: gameState.gameDate,
            lastYear: lastYear,
            inGame: gameState.inGame,
            isPaused: gameState.isPaused,
            lastTick: lastTick,
            dayAccumulator: dayAccumulator
        });
        
        // Initialize news ticker
        initNewsSystem();

        const manageBtn = document.getElementById('main-action-btn');
        manageBtn.innerText = "MANAGE STATE";
        manageBtn.style.display = 'block';
        manageBtn.onclick = openManagement;

        document.getElementById('hud-actions').innerHTML = `
            <button class="big-neon-btn" style="border-color:#00ffff; color:#00ffff;" onclick="saveAndExit()">💾 SAVE & EXIT</button>
        `;
        
        console.log("Save loaded successfully!");

    } else {
        console.log("Starting new game");
        gameState.gameDate = new Date(2026, 0, 1);
        lastYear = gameState.gameDate.getFullYear();
        
        initEconomy();
        renderEconomyUI();
        randomizeJump();
        document.getElementById('tactical-hud').style.display = 'block';

        const manageBtn = document.getElementById('main-action-btn');
        manageBtn.innerText = "ENTER STATE";
        manageBtn.style.display = 'block';
    }
    }, 600);
}

window.handleAction = () => {
    if (!gameState.selectedCountry) {
        alert("No country selected!");
        return;
    }

    if (!gameState.inGame) {
        document.getElementById('tactical-hud').style.display = 'none';
        document.getElementById('main-action-btn').style.display = 'none';
        document.getElementById('loading-overlay').style.display = 'flex';
        document.getElementById('loading-text').innerText = "SYNCHRONIZING ECONOMY...";

setTimeout(() => {
    gameState.gdp = gameState.selectedCountry.gdp;
    
    // Calculate starting treasury based on rank and GDP
    const rank = getCountryRank(gameState.selectedCountry.name.common);
    const numericRank = typeof rank === 'number' ? rank : 100;
    gameState.treasury = calculateStartingTreasury(gameState.gdp, numericRank);
    
    renderTreasury();

    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('tactical-hud').style.display = 'block';
    document.getElementById('temporal-engine').style.display = 'block';
    
    // Move country panel down when in game
    const leftWingStack = document.getElementById('left-wing-stack');
    if (leftWingStack) {
        leftWingStack.classList.add('in-game');
    }
    
    renderClock();
    
    // Initialize news ticker
    initNewsSystem();

    document.getElementById('hud-actions').innerHTML = `
        <button class="big-neon-btn" style="border-color:#00ffff; color:#00ffff;" onclick="saveAndExit()">💾 SAVE & EXIT</button>
    `;

    const manageBtn = document.getElementById('main-action-btn');
    manageBtn.innerText = "MANAGE STATE";
    manageBtn.style.display = 'block';
    manageBtn.onclick = openManagement;
    
    // Initialize happiness
    gameState.happiness = 100;
    gameState.warWith = [];
    renderHappiness();
    
    // CRITICAL: Set game active and reset time tracking at the VERY END
    gameState.inGame = true;
    gameState.isPaused = false;
    lastTick = performance.now();
    dayAccumulator = 0;
    
    console.log("New game started - Time initialized:", {
        inGame: gameState.inGame,
        isPaused: gameState.isPaused,
        lastTick: lastTick,
        dayAccumulator: dayAccumulator
    });

}, 1200);
    } else {
        openManagement();
    }
};

window.saveAndExit = () => {
    const territoriesGDP = gameState.territories.map(t => ({
        name: t.name.common,
        gdp: t.gdp
    }));

    const data = {
        countryName: gameState.selectedCountry.name.common,
        date: gameState.gameDate.toISOString(),
        lastSaved: new Date().toISOString(),
        treasury: gameState.treasury,
        gdp: gameState.gdp,
        territoriesGDP: territoriesGDP,
        happiness: gameState.happiness,
        warWith: gameState.warWith || []
    };

    localStorage.setItem('monetary_state_save', JSON.stringify(data));
    location.reload();
};

window.randomizeJump = () => {
    const valid = gameState.territories.filter(t => t.name.common !== "Antarctica");
    const r = valid[Math.floor(Math.random()*valid.length)];
    if(r) selectLocation(r);
};

window.openManagement = () => {
    if (!gameState.inGame || !gameState.selectedCountry) return;
    
    console.log("Opening management - game continues running");
    
    const managementWin = document.getElementById('management-window');
    const actionWin = document.getElementById('action-window');
    const manageBtn = document.getElementById('main-action-btn');
    
    document.getElementById('manage-country').innerText =
        gameState.selectedCountry.name.common.toUpperCase();

    renderEconomyUI();
    managementWin.style.display = "flex";
    
    // Show action window
    if (actionWin) {
        actionWin.style.display = "flex";
        actionWin.classList.add('in-game');
        console.log("Action window shown");
    } else {
        console.error("Action window not found!");
    }
    
    // Hide manage button
    if (manageBtn) {
        manageBtn.style.display = "none";
    }
};

window.closeActionWindow = () => {
    console.log("Closing action window");
    
    const actionWin = document.getElementById("action-window");
    const manageBtn = document.getElementById('main-action-btn');
    
    // Hide action window
    if (actionWin) {
        actionWin.style.display = "none";
    }
    
    // Show manage button again
    if (manageBtn) {
        manageBtn.style.display = "block";
        manageBtn.innerText = "MANAGE STATE";
    }
    
    console.log("Action window closed, manage button restored");
};

window.closeManage = () => {
    console.log("Closing management - game was never paused");
    
    const managementWin = document.getElementById("management-window");
    const actionWin = document.getElementById("action-window");
    const manageBtn = document.getElementById('main-action-btn');
    
    managementWin.style.display = "none";
    
    // Hide action window
    if (actionWin) {
        actionWin.style.display = "none";
    }
    
    // Show manage button again
    if (manageBtn) {
        manageBtn.style.display = "block";
        manageBtn.innerText = "MANAGE STATE";
    }
    
    console.log("Management window closed");
};

// Initialize diplomatic relations for a country
function initDiplomaticRelations(countryName) {
    if (!gameState.diplomaticRelations[countryName]) {
        // Random initial relationship between -20 to +20 (mostly neutral)
        const baseRelation = Math.floor(Math.random() * 41) - 20;
        
        gameState.diplomaticRelations[countryName] = {
            relationScore: baseRelation,
            tradeEstablished: false,
            tradeVolume: 0
        };
    }
    return gameState.diplomaticRelations[countryName];
}

// Get relationship status text based on new scale
function getRelationshipStatus(score) {
    if (score === -100) return "⚔️ WAR";
    if (score >= 50) return "🤝 ALLY";
    if (score >= 25) return "💚 CLOSE FRIEND";
    if (score >= 10) return "😊 FRIEND";
    if (score > 0) return "😐 NEUTRAL";
    if (score === 0) return "😐 NEUTRAL";
    if (score >= -10) return "😐 NEUTRAL";
    if (score >= -25) return "🤨 UNCOOPERATIVE";
    if (score >= -50) return "😠 TENSE";
    if (score >= -99) return "💢 ENEMY";
    return "⚔️ WAR";
}

// Get relationship color
function getRelationshipColor(score) {
    if (score === -100) return "#ff0000";
    if (score >= 50) return "#00ff41";
    if (score >= 25) return "#00dd33";
    if (score >= 10) return "#88ff88";
    if (score >= 0) return "#aaaaaa";
    if (score >= -10) return "#aaaaaa";
    if (score >= -25) return "#ffaa00";
    if (score >= -50) return "#ff6600";
    if (score >= -99) return "#ff3333";
    return "#ff0000";
}

// Show country info window
window.showCountryInfo = (country) => {
    if (!gameState.inGame || !gameState.selectedCountry) return;
    if (country.name.common === gameState.selectedCountry.name.common) {
        // Clicked own country - open management instead
        openManagement();
        return;
    }
    
    console.log("Opening country info - game continues running");
    
    // DON'T pause game - let it continue running
    // gameState.isPaused = true; // REMOVED
    
    // Hide tactical HUD and show country info panel
    document.getElementById('tactical-hud').style.display = 'none';
    document.getElementById('country-info-panel').style.display = 'block';
    
    // Initialize relations if needed
    const relations = initDiplomaticRelations(country.name.common);
    
    // Build GDP ranking to get rank
    buildGdpRanking();
    const rank = getCountryRank(country.name.common);
    
    // Update window content
    document.getElementById('info-country-name').innerText = country.name.common.toUpperCase();
    document.getElementById('info-country-flag').src = `https://flagcdn.com/w160/${country.cca2.toLowerCase()}.png`;
    document.getElementById('info-rank').innerText = `#${rank}`;
    document.getElementById('info-gdp').innerText = formatMoney(country.gdp || 0);
    document.getElementById('info-population').innerText = country.population.toLocaleString();
    
    // Update diplomatic info
    const statusText = getRelationshipStatus(relations.relationScore);
    const statusColor = getRelationshipColor(relations.relationScore);
    
    document.getElementById('relation-status').innerHTML = 
        `<span style="color: ${statusColor}; font-weight: bold;">${statusText} (${relations.relationScore})</span>`;
    
    if (relations.tradeEstablished) {
        document.getElementById('trade-volume').innerText = formatMoney(relations.tradeVolume);
    } else {
        document.getElementById('trade-volume').innerText = "No Trade Agreement";
    }
    
    // Store current viewing country
    gameState.viewingCountry = country;
};

window.returnToOwnCountry = () => {
    console.log("Returning to own country - game was never paused");
    
    // Hide country info panel
    const infoPanel = document.getElementById('country-info-panel');
    if (infoPanel) {
        infoPanel.style.display = 'none';
        console.log("Country info panel hidden");
    } else {
        console.error("country-info-panel element not found!");
    }
    
    // Show tactical HUD
    const tacticalHud = document.getElementById('tactical-hud');
    if (tacticalHud) {
        tacticalHud.style.display = 'block';
        console.log("Tactical HUD shown");
    } else {
        console.error("tactical-hud element not found!");
    }
    
    gameState.viewingCountry = null;
    // No need to unpause since we never paused
    
    console.log("Returned to own country view");
};

window.closeCountryInfo = () => {
    returnToOwnCountry();
};

window.improveRelations = () => {
    if (!gameState.viewingCountry) return;
    
    const cost = 50000; // 50B
    
    if (gameState.treasury < cost) {
        alert("Insufficient funds! Need $50B to improve relations.");
        return;
    }
    
    const countryName = gameState.viewingCountry.name.common;
    const relations = gameState.diplomaticRelations[countryName];
    
    // Cannot improve if at war
    if (relations.relationScore === -100) {
        alert("Cannot improve relations during wartime! Peace treaty required.");
        return;
    }
    
    // Deduct cost
    gameState.treasury -= cost;
    renderTreasury();
    
    // Improve relations (max 100)
    const oldScore = relations.relationScore;
    relations.relationScore = Math.min(100, relations.relationScore + 10);
    
    // Remove from war list if leaving war state
    if (oldScore === -100 && relations.relationScore > -100) {
        if (gameState.warWith) {
            gameState.warWith = gameState.warWith.filter(c => c !== countryName);
        }
        // Happiness boost from ending war
        gameState.happiness = Math.min(100, gameState.happiness + 5);
        renderHappiness();
    }
    
    // Small happiness boost from diplomacy
    if (relations.relationScore >= 50) {
        gameState.happiness = Math.min(100, gameState.happiness + 2);
        renderHappiness();
    }
    
    // Update display
    const statusText = getRelationshipStatus(relations.relationScore);
    const statusColor = getRelationshipColor(relations.relationScore);
    document.getElementById('relation-status').innerHTML = 
        `<span style="color: ${statusColor}; font-weight: bold;">${statusText} (${relations.relationScore})</span>`;
    
    // Add news
    gameState.newsHeadlines.push(`🤝 ${gameState.selectedCountry.name.common} improves diplomatic ties with ${countryName}`);
    
    alert(`Relations improved!\nNew status: ${statusText} (${relations.relationScore})`);
};

window.establishTrade = () => {
    if (!gameState.viewingCountry) return;
    
    const cost = 100000; // 100B
    
    if (gameState.treasury < cost) {
        alert("Insufficient funds! Need $100B to establish trade.");
        return;
    }
    
    const countryName = gameState.viewingCountry.name.common;
    const relations = gameState.diplomaticRelations[countryName];
    
    if (relations.tradeEstablished) {
        alert("Trade agreement already exists!");
        return;
    }
    
    if (relations.relationScore < 10) {
        alert("Relations too poor! Need at least Friend status (+10) to establish trade.");
        return;
    }
    
    // Deduct cost
    gameState.treasury -= cost;
    renderTreasury();
    
    // Establish trade
    relations.tradeEstablished = true;
    const partnerGDP = gameState.viewingCountry.gdp || 100000;
    relations.tradeVolume = Math.floor((gameState.gdp + partnerGDP) * 0.01);
    
    // Update display
    document.getElementById('trade-volume').innerText = formatMoney(relations.tradeVolume);
    
    // Add news
    gameState.newsHeadlines.push(`📦 ${gameState.selectedCountry.name.common} signs trade deal with ${countryName} - $${(relations.tradeVolume / 1000).toFixed(0)}B annually`);
    
    alert(`Trade established! Annual trade volume: ${formatMoney(relations.tradeVolume)}`);
};

window.worsenRelations = () => {
    if (!gameState.viewingCountry) return;
    
    const countryName = gameState.viewingCountry.name.common;
    const relations = gameState.diplomaticRelations[countryName];
    
    // Confirm action
    if (!confirm(`Are you sure you want to worsen relations with ${countryName}?\nThis will decrease relations by 15 points.`)) {
        return;
    }
    
    // Worsen relations (min -100)
    relations.relationScore = Math.max(-100, relations.relationScore - 15);
    
    // Cancel trade if relations drop too low
    if (relations.tradeEstablished && relations.relationScore < 0) {
        relations.tradeEstablished = false;
        relations.tradeVolume = 0;
        document.getElementById('trade-volume').innerText = "No Trade Agreement";
        alert("Trade agreement cancelled due to poor relations!");
    }
    
    // Update display
    const statusText = getRelationshipStatus(relations.relationScore);
    const statusColor = getRelationshipColor(relations.relationScore);
    document.getElementById('relation-status').innerHTML = 
        `<span style="color: ${statusColor}; font-weight: bold;">${statusText} (${relations.relationScore})</span>`;
    
    // Add news
    if (relations.relationScore === -100) {
        // Add to war list
        if (!gameState.warWith) gameState.warWith = [];
        if (!gameState.warWith.includes(countryName)) {
            gameState.warWith.push(countryName);
        }
        
        // Major happiness loss from war
        gameState.happiness = Math.max(0, gameState.happiness - 15);
        renderHappiness();
        
        gameState.newsHeadlines.push(`⚔️ ${gameState.selectedCountry.name.common} declares WAR on ${countryName}!`);
        alert(`⚔️ WAR DECLARED!\n${countryName} is now at war with you!\n\n⚠️ Citizen happiness decreased by 15%!`);
    } else {
        gameState.newsHeadlines.push(`💢 ${gameState.selectedCountry.name.common} tensions rise with ${countryName}`);
        alert(`Relations worsened!\nNew status: ${statusText} (${relations.relationScore})`);
    }
};

function updateHud() {
    if (!gameState.selectedCountry) return;
    
    buildGdpRanking();
    const rank = getCountryRank(gameState.selectedCountry.name.common);
    
    const rankEl = document.getElementById('rank-display');
    if (rankEl) {
        rankEl.innerText = `🏆 GDP RANK: #${rank}`;
    }
    
    // Update happiness display
    renderHappiness();
}

function renderHappiness() {
    const happiness = Math.max(0, Math.min(100, gameState.happiness));
    
    // Show happiness gauge
    const gaugeEl = document.getElementById('happiness-gauge');
    if (gaugeEl) {
        gaugeEl.style.display = 'block';
    }
    
    const percentEl = document.getElementById('happiness-percent');
    const barEl = document.getElementById('happiness-bar');
    
    if (percentEl) {
        percentEl.innerText = `${happiness}%`;
    }
    
    if (barEl) {
        barEl.style.width = `${happiness}%`;
        
        // Change color based on happiness
        if (happiness <= 20) {
            barEl.style.background = '#ff0000';
        } else if (happiness <= 40) {
            barEl.style.background = '#ff6600';
        } else if (happiness <= 60) {
            barEl.style.background = '#ffaa00';
        } else {
            barEl.style.background = '#00ff41';
        }
    }
    
    // Show/hide warning
    const warningOverlay = document.getElementById('warning-overlay');
    const warningMessage = document.getElementById('warning-message');
    
    if (happiness <= 20 && happiness > 0) {
        if (warningOverlay) warningOverlay.classList.add('active');
        if (warningMessage) warningMessage.classList.add('active');
    } else {
        if (warningOverlay) warningOverlay.classList.remove('active');
        if (warningMessage) warningMessage.classList.remove('active');
    }
}

function updateHappiness() {
    // Factors that affect happiness
    let change = 0;
    
    // Low treasury makes people unhappy
    const treasuryRatio = gameState.treasury / gameState.gdp;
    if (treasuryRatio < 0.1) {
        change -= 5; // Broke government
    } else if (treasuryRatio > 0.4) {
        change += 2; // Good reserves
    }
    
    // Being at war decreases happiness
    if (gameState.warWith && gameState.warWith.length > 0) {
        change -= 10 * gameState.warWith.length;
    }
    
    // Random events
    const random = Math.random();
    if (random < 0.1) {
        change -= 3; // Bad year
    } else if (random < 0.2) {
        change += 3; // Good year
    }
    
    // Base drift (slow decline if doing nothing)
    change -= 1;
    
    // Update happiness
    gameState.happiness = Math.max(0, Math.min(100, gameState.happiness + change));
    
    console.log(`Happiness: ${gameState.happiness}% (${change > 0 ? '+' : ''}${change})`);
}

function triggerGameOver() {
    console.log("GAME OVER!");
    gameState.isPaused = true;
    gameState.inGame = false;
    
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverMessage = document.getElementById('game-over-message');
    
    // Determine game over message
    let message = "";
    
    // Check if at war
    const atWar = gameState.warWith && gameState.warWith.length > 0;
    
    if (atWar) {
        const enemy = gameState.warWith[Math.floor(Math.random() * gameState.warWith.length)];
        const warMessages = [
            `YOUR COUNTRY HAS BEEN OCCUPIED BY ${enemy.toUpperCase()}!`,
            `A NUKE HAS EXPLODED IN YOUR TERRITORY!`,
            `YOU WERE CAUGHT AS A PRISONER OF WAR!`
        ];
        message = "YOU FAILED: " + warMessages[Math.floor(Math.random() * warMessages.length)];
    } else {
        const peacetimeMessages = [
            "A RIOT HAS SUCCEEDED AND YOU GOT THROWN OUT!",
            "A COUP HAS SUCCEEDED IN TAKING OVER YOUR GOVERNMENT!",
            "YOU GOT ASSASSINATED BY THE HATERS!"
        ];
        message = "YOU FAILED: " + peacetimeMessages[Math.floor(Math.random() * peacetimeMessages.length)];
    }
    
    if (gameOverMessage) {
        gameOverMessage.innerText = message;
    }
    
    if (gameOverScreen) {
        gameOverScreen.classList.add('active');
    }
    
    // Add to news
    gameState.newsHeadlines.push(`💀 ${gameState.selectedCountry.name.common} government has fallen!`);
}

function togglePause() { 
    gameState.isPaused = !gameState.isPaused; 
    
    console.log("Toggle pause:", gameState.isPaused ? "PAUSED" : "PLAYING");
    
    document.getElementById('pause-btn').innerText = gameState.isPaused ? "▶" : "⏸"; 
    
    // Reset lastTick when unpausing to prevent time jump
    if (!gameState.isPaused) {
        lastTick = performance.now();
        dayAccumulator = 0;
        console.log("Unpaused - reset time tracking");
    }
}

// ==================== ACTION WINDOW FUNCTIONS ====================

window.sellResources = () => {
    alert("💰 SELL RESOURCES\n\nThis feature is coming soon!\nYou'll be able to sell your resources to other countries for profit.");
};

window.manageMilitary = () => {
    alert("⚔️ MILITARY\n\nThis feature is coming soon!\nYou'll be able to:\n- Build military forces\n- Train troops\n- Develop weapons\n- Defend your nation");
};

window.buildService = () => {
    alert("🏗️ BUILD SERVICE\n\nThis feature is coming soon!\nYou'll be able to:\n- Build infrastructure\n- Develop public services\n- Create hospitals and schools\n- Improve citizen happiness");
};

window.createGroup = () => {
    alert("👥 CREATE GROUP\n\nThis feature is coming soon!\nYou'll be able to:\n- Form international alliances\n- Create trade blocs\n- Establish economic unions\n- Coordinate with allies");
};

window.buyResources = () => {
    alert("🛒 BUY RESOURCES\n\nThis feature is coming soon!\nYou'll be able to buy resources from other countries to boost your economy.");
};

window.viewTaxGraph = () => {
    alert("📊 TAX GRAPH\n\nThis feature is coming soon!\nYou'll be able to:\n- View tax collection data\n- Adjust tax rates\n- See revenue trends\n- Optimize your economy");
};

window.manageSanctions = () => {
    alert("🚫 SANCTIONS\n\nThis feature is coming soon!\nYou'll be able to:\n- Impose sanctions on other countries\n- Manage existing sanctions\n- View sanctions against you\n- Negotiate lifting sanctions");
};

window.giveUp = () => {
    if (!confirm("Are you sure you want to give up?\n\nYou will resign from being president and the game will end.")) {
        return;
    }
    
    console.log("Player resigned!");
    gameState.isPaused = true;
    gameState.inGame = false;
    
    const gameOverScreen = document.getElementById('game-over-screen');
    const gameOverMessage = document.getElementById('game-over-message');
    
    if (gameOverMessage) {
        gameOverMessage.innerText = "YOU GAVE UP: YOU RESIGNED FROM BEING A PRESIDENT";
    }
    
    if (gameOverScreen) {
        gameOverScreen.classList.add('active');
    }
    
    // Add to news
    gameState.newsHeadlines.push(`📰 ${gameState.selectedCountry.name.common} president has resigned from office!`);
};

// ==================== CHANGELOG FUNCTIONS ====================

const changelogVersions = [
    {
        version: "v1.0.1 - Remaking the news and resources system",
        changes: [
            "📄 Fixing the news story generation logic",
            "📊 Fixing the resources system to be more realistic"
        ]
    },
    {
        version: "v1.0.0 - Initial Release",
        changes: [
            "🌍 100+ countries with real (maybe) GDP data",
            "💰 Rank-based starting treasury system",
            "📊 Dynamic economy with resources, inflation, unemployment",
            "🕐 Time controls (pause, 1x-5x speed)",
            "🗺️ Interactive world map",
            "💾 Save and load functionality",
            "🎮 Management window with scrollable resources",
            "🎯 Country selection system",
            "🎨 Full-width news bar design"
        ]
    }
];

let currentChangelogIndex = 0;

function renderChangelogVersion() {
    const version = changelogVersions[currentChangelogIndex];
    const display = document.getElementById('changelog-display');
    
    if (!display) return;
    
    const changesList = version.changes.map(change => `<li>${change}</li>`).join('');
    
    display.innerHTML = `
        <h2>${version.version}</h2>
        <ul>${changesList}</ul>
    `;
    
    // Update counter
    const currentNum = document.getElementById('current-version-num');
    const totalNum = document.getElementById('total-versions');
    if (currentNum) currentNum.innerText = currentChangelogIndex + 1;
    if (totalNum) totalNum.innerText = changelogVersions.length;
    
    // Update button states
    const prevBtn = document.getElementById('prev-version-btn');
    const nextBtn = document.getElementById('next-version-btn');
    
    if (prevBtn) {
        prevBtn.disabled = currentChangelogIndex === 0;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentChangelogIndex === changelogVersions.length - 1;
    }
}

window.openChangelog = () => {
    const mainMenu = document.getElementById('main-menu');
    const changelogMenu = document.getElementById('changelog-menu');
    
    // COMPLETELY REPLACE main menu
    if (mainMenu) mainMenu.style.display = 'none';
    if (changelogMenu) changelogMenu.style.display = 'block';
    
    // Reset to first version and render
    currentChangelogIndex = 0;
    renderChangelogVersion();
    
    console.log("Changelog opened - main menu replaced");
};

window.closeChangelog = () => {
    const mainMenu = document.getElementById('main-menu');
    const changelogMenu = document.getElementById('changelog-menu');
    
    // RESTORE main menu
    if (changelogMenu) changelogMenu.style.display = 'none';
    if (mainMenu) mainMenu.style.display = 'block';
    
    console.log("Changelog closed - main menu restored");
};

window.nextVersion = () => {
    if (currentChangelogIndex < changelogVersions.length - 1) {
        currentChangelogIndex++;
        renderChangelogVersion();
    }
};

window.previousVersion = () => {
    if (currentChangelogIndex > 0) {
        currentChangelogIndex--;
        renderChangelogVersion();
    }
};
function adjustSpeed(delta) { 
    let s = gameState.gameSpeed + delta; 
    if (s >= 1 && s <= 5) { 
        gameState.gameSpeed = s; 
        document.querySelectorAll('.speed-bar').forEach((b, i) => b.classList.toggle('active', i < s)); 
    } 
}

window.addEventListener("resize", () => {
    if (!projection || !svg) return;

    projection
    .scale(window.innerWidth / 6.5)
    .translate([
        window.innerWidth / 2,
        window.innerHeight * 0.5
    ]);

svg
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight);
});

function gameLoop() {
    tick();
    requestAnimationFrame(gameLoop);
}

// Watchdog to detect and fix stuck time
let lastDateCheck = new Date();
let lastDateValue = null;
setInterval(() => {
    if (gameState.inGame && !gameState.isPaused) {
        const currentDateStr = gameState.gameDate.toISOString();
        
        // Check if date hasn't changed in 10 seconds
        if (currentDateStr === lastDateValue) {
            const timeSinceLastChange = Date.now() - lastDateCheck.getTime();
            
            if (timeSinceLastChange > 10000) {
                console.error("TIME STUCK DETECTED!");
                console.log("Attempting to fix...");
                console.log("Current state:", {
                    inGame: gameState.inGame,
                    isPaused: gameState.isPaused,
                    gameSpeed: gameState.gameSpeed,
                    dayAccumulator: dayAccumulator,
                    gameDate: gameState.gameDate
                });
                
                // Reset time tracking
                lastTick = performance.now();
                dayAccumulator = 0;
                
                console.log("Time tracking reset. Game should continue.");
            }
        } else {
            lastDateValue = currentDateStr;
            lastDateCheck = new Date();
        }
    }
}, 5000); // Check every 5 seconds

gameLoop();