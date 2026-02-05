/**
 * MONETARY STATE - THE TOTAL GLOBAL ECONOMY BUILD V1.2.6
 * Features: Integrated Persistence (Save/Load), Top-Right Time Controller, 
 * Initial Loading Screen, and Territory Markers.
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
    saveData: JSON.parse(localStorage.getItem('monetary_state_save')) || null
};

const MAX_TREASURY = 9_000_000_000_000_000;

const realWorldData = {
    "United States": 31821, "China": 20651, "Germany": 5328, "India": 4506, "Japan": 4464,
    "United Kingdom": 4226, "France": 3559, "Italy": 2702, "Russia": 2509, "Canada": 2421,
    "Brazil": 2293, "Spain": 2042, "Mexico": 2031, "Australia": 1948, "South Korea": 1937,
    "Thailand": 561, "Vietnam": 511, "Malaysia": 505, "Philippines": 533
};

let gdpRanking = [];

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
    const index = gdpRanking.findIndex(
        c => c.name.common === countryName
    );

    if (index === -1) return "100+";

    const rank = index + 1;
    return rank <= 100 ? rank : "100+";
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

document.addEventListener("DOMContentLoaded", () => {
    const win = document.getElementById("management-window");
    if (win) win.style.display = "none";
});

function addToTreasury(amount) {
    gameState.treasury = Math.min(
        gameState.treasury + amount,
        MAX_TREASURY
    );
}

let lastTick = performance.now();
let dayAccumulator = 0;
let lastYear = gameState.gameDate.getFullYear();

function getCountryGDP(country) {
    if (realWorldData[country.name.common]) {
        return realWorldData[country.name.common] * 1000;
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
        c.gdp = getCountryGDP(c);
    });
}

function selectLocation(data) {
    if (!gameState.territories.includes(data)) {
    console.warn("Selected country not from territories array");
}
    gameState.selectedCountry = data;
if (typeof data.gdp !== "number") {
    data.gdp = getCountryGDP(data);
}
gameState.gdp = data.gdp;
if (gameState.treasury === 0) {
    gameState.treasury = data.gdp;
}
    buildGdpRanking();             
    renderTreasury();
    const rank = getCountryRank(data.name.common);

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

function tick() {
    const now = performance.now();
    const delta = now - lastTick;
    lastTick = now;
    if (!gameState.inGame || gameState.isPaused) return;
    dayAccumulator += (delta / 1000) * gameState.gameSpeed;

    while (dayAccumulator >= 1) {
        gameState.gameDate.setDate(
            gameState.gameDate.getDate() + 1
        );
        dayAccumulator--;

        document.getElementById("game-clock").innerText =
            gameState.gameDate.toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric"
            }).toUpperCase();

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

    buildGdpRanking();
    updateHud();
    renderTreasury();

    updateEconomy();
    renderEconomyUI();
        }
    }
}

const saveWindow = document.getElementById("save-window");

if (gameState.saveData) {
    saveWindow.style.display = "block";

    document.getElementById("save-country").textContent =
        gameState.saveData.country.name.common;

    document.getElementById("save-date").textContent =
        new Date(gameState.saveData.date).toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

    document.getElementById("load-save-btn").onclick = () => {
        startSimulation(true);
    };
}

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

function initEconomy() {
    for (const category in economyState.resources) {
        const items = economyState.resources[category];
        const count = items.length;

        let base = Math.floor(100 / count);
        let remainder = 100 - base * count;

        economyState.values[category] = {};

        items.forEach((item, index) => {
            let value = base + (index === 0 ? remainder : 0);

            economyState.values[category][item] = {
                percent: value,
                change: randomChange(category)
            };
        });
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
        for (const item in economyState.values[category]) {
            const data = economyState.values[category][item];
            const delta = randomDelta();

            data.change = delta;
            data.percent += delta;

            if (data.percent < 0) data.percent = 0;
            if (data.percent > 100) data.percent = 100;
        }

        let total = 0;
        for (const item in economyState.values[category]) {
            total += economyState.values[category][item].percent;
        }

        for (const item in economyState.values[category]) {
            economyState.values[category][item].percent =
                Math.round((economyState.values[category][item].percent / total) * 100);
        }
    }

    renderEconomyUI();
}

function renderEconomyUI() {
    const container = document.getElementById("scroll-engine");
    if (!container) return;

    container.innerHTML = "";

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
        if (data.change > 0) color = "#00ff41";
        if (data.change < 0) color = "#ff4444";

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
    container.appendChild(section);
    }
}

function formatMoney(value) {
    if (value >= 1_000_000_000_000) {
        return `$${(value / 1_000_000_000_000).toFixed(2)} Trillion`;
    }
    if (value >= 1_000_000_000) {
        return `$${(value / 1_000_000_000).toFixed(2)} Billion`;
    }
    if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(2)} Million`;
    }
    return `$${value.toLocaleString()}`;
}

const sortedList = Object.keys(realWorldData).sort((a,b) => realWorldData[b] - realWorldData[a]);

const style = document.createElement('style');
style.innerHTML = `
    body { background: #000; color: #00ff41; font-family: 'Courier New', monospace; margin: 0; overflow: hidden; }
    #menu-screen { position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; background: #000; z-index: 9000; text-align: center; }
    #main-title { font-size: 5.5em; letter-spacing: 15px; margin: 0; text-shadow: 0 0 20px #00ff41; }
    .play-launch { width: 350px; padding: 20px; font-size: 1.8em; font-weight: bold; border: 2px solid #00ff41; color: #00ff41; background:none; cursor:pointer;}
    .play-launch:hover { background: #00ff41; color: #000; }
    
    #loading-overlay { position: fixed; inset: 0; background: #000; z-index: 10000; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    #loading-container { width: 400px; text-align: center; }
    #loading-text { color: #00ff41; font-size: 1.2em; letter-spacing: 3px; margin-bottom: 20px; }
    #loading-bar-container { width: 100%; height: 4px; background: #002200; border-radius: 2px; overflow: hidden; }
    #loading-bar-fill { width: 0%; height: 100%; background: #00ff41; box-shadow: 0 0 10px #00ff41; transition: width 0.3s; }

    #temporal-engine { position: absolute; top: 20px; right: 20px; background: #000; border: 3px solid #00ff41; border-radius: 15px; padding: 15px; z-index: 9000; text-align: center; display: none; }
    #game-clock { font-size: 1.8em; font-weight: bold; margin-bottom: 10px; color: #00ff41; }
    .time-btn { background: none; border: 2px solid #00ff41; color: #00ff41; border-radius: 5px; cursor: pointer; font-size: 1.2em; padding: 5px 10px; }
    #speed-meter { display: flex; gap: 4px; padding: 5px; border: 1px solid #00ff41; border-radius: 4px; justify-content: center; }
    .speed-bar { width: 8px; height: 18px; background: #003300; }
    .speed-bar.active { background: #00ff41; }

    #tactical-hud { background: #000; border: 2px solid #00ff41; padding: 25px; width: 360px; }
    #left-wing-stack { position: absolute; top: 20px; left: 20px; z-index: 5000; }
    .side-panel { background: #000; border: 2px solid #00ff41; padding: 25px; display: none; flex-direction: column; width: 360px; margin-top: 10px; }
    .big-neon-btn { background: #000; border: 2px solid #00ff41; color: #00ff41; padding: 15px; width: 100%; font-family: inherit; font-weight: bold; cursor: pointer; margin-top: 10px; }
    .fixed-corner-btn { position: absolute; bottom: 30px; right: 30px; padding: 20px 50px; border: 3px solid #00ff41; background: #000; color: #00ff41; font-family: inherit; font-weight: bold; cursor: pointer; font-size: 1.4em; z-index: 8000; }
    
    .land { fill: #001a00; stroke: #00ff41; stroke-width: 0.5px; cursor: pointer; }
    .territory-pin { fill: #00ff41; cursor: pointer; filter: drop-shadow(0 0 3px #00ff41); }
`;
document.head.appendChild(style);
let g, projection, path, svg, zoom;
async function startSimulation(isLoad) {if (!isLoad) {
    initEconomy();
}
    renderEconomyUI();
    const overlay = document.getElementById('loading-overlay');
    const barFill = document.getElementById('loading-bar-fill');
    document.getElementById('menu-screen').style.display = 'none';
    overlay.style.display = 'flex';

    if (!svg) {
        svg = d3.select("#viewport").append("svg").attr("width", "100%").attr("height", "100%");
        g = svg.append("g");
        zoom = d3.zoom().scaleExtent([1, 15]).on("zoom", (e) => g.attr("transform", e.transform));
        svg.call(zoom);
        projection = d3.geoMercator().scale(250).translate([window.innerWidth/2, window.innerHeight/1.5]);
        path = d3.geoPath().projection(projection);

        barFill.style.width = "40%";
        const world = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
        const resp = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,cca2,population');
        gameState.territories = await resp.json();
        assignRealGDP();

        if (isLoad && gameState.saveData?.territoriesGDP) {
            restoreTerritoriesGDP(gameState.saveData.territoriesGDP);
        }

        buildGdpRanking();

        barFill.style.width = "70%";
        g.selectAll("path").data(world.features).enter().append("path").attr("d", path)
            .attr("class", d => d.properties.name === "Antarctica" ? "land antarctica" : "land")
            .on("click", (e, d) => {
                if(d.properties.name === "Antarctica" || gameState.inGame) return;
                const c = gameState.territories.find(t => t.name.common === ({"USA":"United States"}[d.properties.name] || d.properties.name));
                if(c) selectLocation(c);
            });

        g.selectAll("circle").data(gameState.territories.filter(d => d.latlng?.length === 2)).enter().append("circle")
            .attr("cx", d => projection([d.latlng[1], d.latlng[0]])[0])
            .attr("cy", d => projection([d.latlng[1], d.latlng[0]])[1])
            .attr("r", 3).attr("class", "territory-pin")
            .on("click", (e, d) => { e.stopPropagation(); if(!gameState.inGame) selectLocation(d); });
    }

    barFill.style.width = "100%";

setTimeout(() => {
    overlay.style.display = 'none';
    document.getElementById('viewport').style.display = 'block';

    lastTick = performance.now();
    dayAccumulator = 0;
    lastYear = gameState.gameDate.getFullYear();

    if (isLoad && gameState.saveData) {

        gameState.selectedCountry = gameState.territories.find(
            c => c.name.common === gameState.saveData.countryName
        );

        if (!gameState.selectedCountry) {
            console.warn("Saved country not found in territories");
            return;
        }

        gameState.gameDate = new Date(gameState.saveData.date);
        gameState.inGame = true;

        gameState.gdp = gameState.saveData.gdp;
        gameState.treasury = gameState.saveData.treasury;
        gameState.selectedCountry.gdp = gameState.gdp;

        selectLocation(gameState.selectedCountry);

        renderTreasury();
        buildGdpRanking();
        updateHud();

        document.getElementById('tactical-hud').style.display = 'block';
        document.getElementById('temporal-engine').style.display = 'block';

        const manageBtn = document.getElementById('main-action-btn');
        manageBtn.innerText = "MANAGE STATE";
        manageBtn.style.display = 'block';
        manageBtn.onclick = openManagement;

        document.getElementById('hud-actions').innerHTML = `
            <button class="big-neon-btn" style="border-color:#00ffff; color:#00ffff;" onclick="saveAndExit()">💾 SAVE & EXIT</button>
        `;
    } else {
        randomizeJump();
    }

}, 600);

}

window.handleAction = () => {
    if(!gameState.inGame) {
        document.getElementById('tactical-hud').style.display = 'none';
        document.getElementById('main-action-btn').style.display = 'none';
        document.getElementById('loading-overlay').style.display = 'flex';
        document.getElementById('loading-text').innerText = "SYNCHRONIZING ECONOMY...";
        
        setTimeout(() => {
            gameState.inGame = true;
            lastTick = performance.now();
            dayAccumulator = 0;
            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('tactical-hud').style.display = 'block';
            document.getElementById('hud-actions').innerHTML = `
                <button class="big-neon-btn" style="border-color:#00ffff; color:#00ffff;" onclick="saveAndExit()">💾 SAVE & EXIT</button>
            `;
            const manageBtn = document.getElementById('main-action-btn');
            manageBtn.innerText = "MANAGE STATE";
            manageBtn.style.display = 'block';
            manageBtn.onclick = openManagement;
            document.getElementById('temporal-engine').style.display = 'block';
        }, 1200);
    } else {
    }
};

window.saveAndExit = () => {
    const data = {
        countryName: gameState.selectedCountry.name.common,
        date: Date.now(),
        treasury: gameState.treasury,
        gdp: gameState.gdp,
        territoriesGDP: gameState.territories.map(c => ({
            name: c.name.common,
            gdp: c.gdp
        }))
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
    gameState.isPaused = true;
    const win = document.getElementById('management-window');
    document.getElementById('manage-country').innerText =
    gameState.selectedCountry.name.common.toUpperCase();

    renderEconomyUI();
    win.style.display = "flex";
};

window.closeManage = () => {
    const win = document.getElementById("management-window");
    win.style.display = "none";
    gameState.isPaused = false;
};

function togglePause() { gameState.isPaused = !gameState.isPaused; document.getElementById('pause-btn').innerText = gameState.isPaused ? "▶" : "⏸"; }
function adjustSpeed(delta) { 
    let s = gameState.gameSpeed + delta; 
    if (s >= 1 && s <= 5) { 
        gameState.gameSpeed = s; 
        document.querySelectorAll('.speed-bar').forEach((b, i) => b.classList.toggle('active', i < s)); 
    } 
}

function gameLoop() {
    tick();
    requestAnimationFrame(gameLoop);
}

gameLoop();