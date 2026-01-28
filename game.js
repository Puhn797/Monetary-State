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
    // Check for existing save data on startup
    saveData: JSON.parse(localStorage.getItem('monetary_state_save')) || null
};

const realWorldData = {
    "United States": 31821, "China": 20651, "Germany": 5328, "India": 4506, "Japan": 4464,
    "United Kingdom": 4226, "France": 3559, "Italy": 2702, "Russia": 2509, "Canada": 2421,
    "Brazil": 2293, "Spain": 2042, "Mexico": 2031, "Australia": 1948, "South Korea": 1937,
    "Thailand": 561, "Vietnam": 511, "Malaysia": 505, "Philippines": 533
};

function formatMoney(valueInBillions) {
    if (valueInBillions >= 1000) return `$${(valueInBillions / 1000).toFixed(2)} Trillion`;
    return `$${valueInBillions.toFixed(1)} Billion`;
}

const sortedList = Object.keys(realWorldData).sort((a,b) => realWorldData[b] - realWorldData[a]);

// --- INITIAL RENDER ---
document.body.innerHTML = `
    <div id="loading-overlay" style="display:none;">
        <div id="loading-container">
            <div id="loading-text">INITIALIZING GLOBAL SYSTEMS...</div>
            <div id="loading-bar-container"><div id="loading-bar-fill"></div></div>
        </div>
    </div>
    
    <div id="viewport" style="display:none;">
        <div id="temporal-engine">
            <div id="game-clock">JAN 01, 2026</div>
            <div id="speed-controls">
                <button id="pause-btn" class="time-btn" onclick="togglePause()">⏸</button>
                <button class="time-btn" onclick="adjustSpeed(-1)">➖</button>
                <div id="speed-meter">
                    <div class="speed-bar active"></div><div class="speed-bar"></div>
                    <div class="speed-bar"></div><div class="speed-bar"></div>
                    <div class="speed-bar"></div>
                </div>
                <button class="time-btn" onclick="adjustSpeed(1)">➕</button>
            </div>
        </div>

        <div id="left-wing-stack">
            <div id="tactical-hud">
                <div id="hud-header">
                    <img id="country-flag" src="" alt="">
                    <div id="country-name-small">SELECT STATE</div>
                </div>
                <div id="hud-stats">
                    <p id="money-display">💰 GDP: ---</p>
                    <p id="rank-display">🏆 Rank: ---</p>
                    <p id="pop-display">👥 Pop: ---</p>
                </div>
                <div id="hud-actions">
                    <button id="btn-rand" class="big-neon-btn" onclick="randomizeJump()">RANDOMIZE</button>
                    <button id="btn-exit-main" class="big-neon-btn btn-exit" onclick="location.reload()">EXIT GAME</button>
                </div>
            </div>

            <div id="management-window" class="side-panel">
                <h2 id="manage-country" style="color:#fff; border-bottom: 2px solid #00ff41;"></h2>
                <div class="play-stats-block">
                    <div class="stat-line"><span>Inflation rate:</span> <span class="val">2.0%</span></div>
                    <div class="stat-line"><span>Unemployment rate:</span> <span class="val">3.1%</span></div>
                </div>
                <div id="scroll-engine">
                    <h3 class="cat-head">RESOURCES:</h3>
                    <ul class="res-list">
                        <li>Natural Gas: 32% <span class="up">(+2%)</span></li>
                        <li>Agriculture: 43% <span class="up">(+7%)</span></li>
                        <li>Crude Oil: 22% <span class="up">(+1%)</span></li>
                    </ul>
                </div>
                <button class="big-neon-btn" onclick="closeManage()">CLOSE INTERFACE</button>
            </div>
        </div>

        <button id="main-action-btn" class="fixed-corner-btn" onclick="handleAction()">ENTER STATE</button>
    </div>

    <div id="menu-screen">
        <div id="menu-content">
            <div id="version-tag">INTERACTIVE ECONOMIC GAME V1.0.0</div>
            <h1 id="main-title">MONETARY STATE</h1>
            <div style="display:flex; flex-direction:column; gap:15px; align-items:center;">
                <button class="btn play-launch" onclick="startSimulation(false)">PLAY</button>
                ${gameState.saveData ? `<button id="load-btn" class="btn play-launch" style="border-color:#00ffff; color:#00ffff;" onclick="startSimulation(true)">LOAD SAVE</button>` : ''}
            </div>
            <div id="credits-container">
                <div class="credit-header">DEVELOPED BY:</div>
                <div class="credit-name">Kunanon Lerdsakunjinda (Kor) No. 2 M.3/11</div>
                <div class="credit-name">Taweesak Poonoi (Tonkaow) No. 5 M.3/11</div>
                <div class="credit-name">Tanaphat Prempee (Namo) No. 7 M.3/11</div>
                <div class="credit-name">Asama Noiuthai (Puhn) No. 13 M.3/11</div>
            </div>
        </div>
    </div>
`;

// --- STYLES ---
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

// --- LOGIC FUNCTIONS ---

async function startSimulation(isLoad) {
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
        
        if (isLoad && gameState.saveData) {
            gameState.gameDate = new Date(gameState.saveData.date);
            selectLocation(gameState.saveData.country);
            handleAction(); // Jump straight into game mode
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
            document.getElementById('loading-overlay').style.display = 'none';
            document.getElementById('tactical-hud').style.display = 'block';
            document.getElementById('hud-actions').innerHTML = `
                <button class="big-neon-btn" style="border-color:#00ffff; color:#00ffff;" onclick="saveAndExit()">💾 SAVE & EXIT</button>
            `;
            const manageBtn = document.getElementById('main-action-btn');
            manageBtn.innerText = "MANAGE STATE";
            manageBtn.style.display = 'block';
            document.getElementById('temporal-engine').style.display = 'block';
        }, 1200);
    } else {
        const win = document.getElementById('management-window');
        document.getElementById('manage-country').innerText = gameState.selectedCountry.name.common.toUpperCase();
        win.style.display = win.style.display === "flex" ? "none" : "flex";
    }
};

function selectLocation(data) {
    gameState.selectedCountry = data;
    const gdpValue = realWorldData[data.name.common] || (data.population / 1000000) * 5;
    const rank = sortedList.indexOf(data.name.common) + 1 || "100+";
    document.getElementById('country-name-small').innerText = data.name.common.toUpperCase();
    document.getElementById('country-flag').src = `https://flagcdn.com/w160/${data.cca2.toLowerCase()}.png`;
    document.getElementById('money-display').innerText = `💰 GDP: ${formatMoney(gdpValue)}`;
    document.getElementById('rank-display').innerText = `🏆 Rank: #${rank}`;
    document.getElementById('pop-display').innerText = `👥 Pop: ${data.population.toLocaleString()}`;
    const coords = projection([data.latlng[1], data.latlng[0]]);
    svg.transition().duration(1000).call(zoom.transform, d3.zoomIdentity.translate(window.innerWidth/2, window.innerHeight/2).scale(6).translate(-coords[0], -coords[1]));
}

window.saveAndExit = () => {
    const data = { country: gameState.selectedCountry, date: gameState.gameDate.getTime() };
    localStorage.setItem('monetary_state_save', JSON.stringify(data));
    location.reload(); 
};

window.randomizeJump = () => {
    const valid = gameState.territories.filter(t => t.name.common !== "Antarctica");
    const r = valid[Math.floor(Math.random()*valid.length)];
    if(r) selectLocation(r);
};

window.closeManage = () => document.getElementById('management-window').style.display = "none";
function togglePause() { gameState.isPaused = !gameState.isPaused; document.getElementById('pause-btn').innerText = gameState.isPaused ? "▶" : "⏸"; }
function adjustSpeed(delta) { 
    let s = gameState.gameSpeed + delta; 
    if (s >= 1 && s <= 5) { 
        gameState.gameSpeed = s; 
        document.querySelectorAll('.speed-bar').forEach((b, i) => b.classList.toggle('active', i < s)); 
    } 
}
function tick() {
    if (!gameState.inGame || gameState.isPaused) return;
    gameState.gameDate.setDate(gameState.gameDate.getDate() + gameState.gameSpeed);
    document.getElementById('game-clock').innerText = gameState.gameDate.toLocaleDateString('en-US', {month:'short', day:'2-digit', year:'numeric'}).toUpperCase();
}
setInterval(tick, 1000);