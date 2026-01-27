/**
 * MONETARY STATE - STABLE BUILD
 * FIX: Robust Global Ranking & Integrated Save/Load System
 */

let gameState = {
    playerCountry: null,
    selectedCountry: null,
    inGame: false,
    territories: [],
    // Load save from browser storage
    saveData: JSON.parse(localStorage.getItem('monetary_state_save')) || null
};

// INITIAL UI STRUCTURE
document.body.innerHTML += `
    <div id="loading-overlay">
        <div id="loading-text">CONNECTING TO SATELLITES...</div>
    </div>
    <div id="menu-screen">
        <h1 id="main-title">MONETARY STATE</h1>
        <div id="menu-buttons" style="display:flex; flex-direction:column; gap:20px; align-items:center;">
            <button class="btn" style="width:400px;" onclick="startSimulation(false)">NEW GAME</button>
            
            <div id="save-window" style="display: ${gameState.saveData ? 'block' : 'none'};">
                <div class="save-card">
                    <h3 style="margin-bottom:5px;">SAVED GAME: <span style="color:#fff">${gameState.saveData?.country || ''}</span></h3>
                    <p style="margin-bottom:15px; color:#888; font-size:0.8em;">${gameState.saveData?.timestamp || ''}</p>
                    <button class="mini-btn" style="width:100%; font-size:1.2em;" onclick="startSimulation(true)">PLAY</button>
                </div>
            </div>
        </div>
        <div id="credits-container">
            <div class="credit-header">DEVELOPED BY:</div>
            <div class="credit-name">Kunanon Lerdsakunjinda (Kor) No. 2 M.3/11</div>
            <div class="credit-name">Taweesak Poonoi (Tonkaow) No. 5 M.3/11</div>
            <div class="credit-name">Tanaphat Prempee (Namo) No. 7 M.3/11</div>
            <div class="credit-name">Asama Noiuthai (Puhn) No. 13 M.3/11</div>
        </div>
    </div>
    <div id="viewport">
        <div id="tactical-hud">
            <div id="hud-header">
                <img id="country-flag" src="" alt="Flag">
                <div id="country-name-small">SYNCING...</div>
            </div>
            <div id="hud-stats">
                <p id="money-display">💰 Economy: $---</p>
                <p id="rank-display">🏆 Global Rank: #--</p>
                <p id="pop-display">👥 Population: ---</p>
            </div>
            <div id="hud-actions">
                <button id="random-btn" class="mini-btn" onclick="randomizeJump()">RANDOMIZE</button>
                <button id="exit-pre-btn" class="mini-btn btn-exit" onclick="location.reload()">✖ EXIT</button>
            </div>
            <button id="save-exit-btn" class="mini-btn" style="display:none; width:100%; border-color:#00ff41; margin-top:10px;" onclick="saveAndExit()">💾 SAVE & EXIT</button>
        </div>

        <div id="management-window">
            <div id="manage-header">COMMAND CENTER: <span id="manage-country" style="color:#fff"></span></div>
            <div id="manage-content">
                <div class="stat-section">
                    <p><strong>Inflation rate:</strong> 2.0%</p>
                    <p><strong>Unemployment rate:</strong> 3%</p>
                </div>
                <hr style="border:0; border-top:1px solid #00ff41; margin:15px 0;">
                <div class="resource-section">
                    <h3 style="color:#fff; text-decoration:underline;">RESOURCES</h3>
                    <h4>Minerals & Energy</h4>
                    <ul><li>Gas: 32% <span class="up">(+2%)</span></li><li>Oil: 22% <span class="up">(+1%)</span></li><li>Tin: 1% <span class="down">(-1%)</span></li></ul>
                    <h4>Rock</h4>
                    <ul><li>Gypsum: 16% <span class="up">(+3%)</span></li><li>Lignite: 41% <span class="up">(+5%)</span></li></ul>
                    <h4>Agriculture & Marine</h4>
                    <ul><li>Rice: 43% <span class="up">(+7%)</span></li><li>Fish: 20% <span class="up">(+6%)</span></li></ul>
                </div>
            </div>
            <button class="mini-btn" style="width:100%; margin-top:10px;" onclick="closeManage()">CLOSE OVERLAY</button>
        </div>

        <button id="main-action-btn" class="fixed-corner-btn" onclick="handleAction()">ENTER STATE</button>
    </div>
`;

const style = document.createElement('style');
style.innerHTML = `
    #tactical-hud { position: absolute; top: 30px; left: 30px; background: rgba(0, 10, 0, 0.95); border: 2px solid #00ff41; padding: 25px; width: 350px; box-shadow: 0 0 30px rgba(0, 255, 65, 0.4); z-index: 5000; }
    #country-flag { width: 60px; height: auto; border: 1px solid #00ff41; }
    .territory-pin { fill: #00ff41; opacity: 0.8; filter: drop-shadow(0 0 5px #00ff41); cursor: pointer; }
    .save-card { background: rgba(0, 20, 0, 0.9); border: 1px solid #00ff41; padding: 20px; width: 360px; box-shadow: 0 0 15px rgba(0,255,65,0.2); }
    #management-window { position: absolute; top: 30px; left: 400px; background: rgba(0, 15, 0, 0.98); border: 2px solid #00ff41; width: 400px; max-height: 85vh; overflow-y: auto; padding: 25px; display: none; z-index: 7000; color: #00ff41; }
    .fixed-corner-btn { position: absolute; bottom: 50px; right: 50px; padding: 20px 60px; background: rgba(0, 20, 0, 0.9); border: 2px solid #00ff41; color: #00ff41; font-family: 'Courier New', monospace; font-size: 1.8em; font-weight: bold; cursor: pointer; z-index: 6000; }
    .mini-btn { background: none; border: 1px solid #00ff41; color: #00ff41; padding: 12px; font-family: inherit; cursor: pointer; text-transform: uppercase; }
    .mini-btn:hover { background: #00ff41; color: #000; }
    .btn-exit { border-color: #ff4444; color: #ff4444; }
    .up { color: #00ff41; } .down { color: #ff4444; }
`;
document.head.appendChild(style);

let g, projection, path, svg, zoom;

const nameFix = (n) => {
    const map = { "USA": "United States", "England": "United Kingdom", "Somaliland": "Somalia", "East Timor": "Timor-Leste" };
    return map[n] || n;
};

// Calculation to determine rank based on population and region
function getEconomyValue(c) {
    const regionMulti = { "Europe": 1.5, "Americas": 1.2, "Asia": 0.8, "Africa": 0.4, "Oceania": 1.1 };
    return Math.floor((c.population * (regionMulti[c.region] || 0.5)) / 100);
}

async function startSimulation(isLoad) {
    document.getElementById('menu-screen').style.display = 'none';
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';
    document.getElementById('loading-text').innerText = isLoad ? "RESTORING SAVED STATE..." : "INITIALIZING GLOBAL INTERFACE...";
    
    if (!svg) {
        svg = d3.select("#viewport").append("svg");
        g = svg.append("g");
        zoom = d3.zoom().scaleExtent([1, 15]).on("zoom", (e) => g.attr("transform", e.transform));
        svg.call(zoom);
        projection = d3.geoMercator().scale(window.innerWidth / 6.2).translate([window.innerWidth / 2, window.innerHeight / 1.5]);
        path = d3.geoPath().projection(projection);
        
        const world = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson");
        const resp = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,population,cca2,region');
        gameState.territories = await resp.json();

        // Draw Map
        g.selectAll("path").data(world.features).enter().append("path").attr("d", path).attr("class", "land")
            .on("click", (e, d) => { if(!gameState.inGame) selectLocation(gameState.territories.find(t => t.name.common === nameFix(d.properties.name))); });

        // Draw Pins
        g.selectAll("circle").data(gameState.territories.filter(d => d.latlng?.length === 2)).enter().append("circle")
            .attr("cx", d => projection([d.latlng[1], d.latlng[0]])[0])
            .attr("cy", d => projection([d.latlng[1], d.latlng[0]])[1])
            .attr("r", 2.5).attr("class", "territory-pin")
            .on("click", (e, d) => { e.stopPropagation(); if(!gameState.inGame) selectLocation(d); });
    }

    setTimeout(() => {
        overlay.style.display = 'none';
        document.getElementById('viewport').style.display = 'block';
        if (isLoad && gameState.saveData) {
            const country = gameState.territories.find(t => t.name.common === gameState.saveData.country);
            selectLocation(country);
            handleAction(); 
        } else {
            randomizeJump();
        }
    }, 1500);
}

function selectLocation(data) {
    if (!data) return;
    gameState.selectedCountry = data;
    
    // UI Update
    document.getElementById('country-name-small').innerText = data.name.common.toUpperCase();
    document.getElementById('country-flag').src = `https://flagcdn.com/w160/${data.cca2.toLowerCase()}.png`;
      
    // Rank Logic - Fixed rank disappearing
    const sorted = gameState.territories.slice().sort((a,b) => getEconomyValue(b) - getEconomyValue(a));
    const rank = sorted.findIndex(c => c.name.common === data.name.common) + 1;
    
    document.getElementById('money-display').innerText = `💰 Economy: $${getEconomyValue(data).toLocaleString()}`;
    document.getElementById('rank-display').innerText = `🏆 Global Rank: #${rank}`;
    document.getElementById('pop-display').innerText = `👥 Population: ${data.population.toLocaleString()}`;
    
    // Zoom
    const coords = projection([data.latlng[1], data.latlng[0]]);
    svg.transition().duration(1500).call(zoom.transform, d3.zoomIdentity.translate(window.innerWidth/2, window.innerHeight/2).scale(8).translate(-coords[0], -coords[1]));
}

window.handleAction = () => {
    if(!gameState.inGame) {
        gameState.playerCountry = gameState.selectedCountry;
        gameState.inGame = true;
        document.getElementById('main-action-btn').innerText = "MANAGE STATE";
        document.getElementById('hud-actions').style.display = "none";
        document.getElementById('save-exit-btn').style.display = "block";
    } else {
        const win = document.getElementById('management-window');
        document.getElementById('manage-country').innerText = gameState.playerCountry.name.common.toUpperCase();
        win.style.display = (win.style.display === "block") ? "none" : "block";
    }
};

window.saveAndExit = () => {
    const now = new Date();
    const timestamp = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    
    localStorage.setItem('monetary_state_save', JSON.stringify({
        country: gameState.playerCountry.name.common,
        timestamp: timestamp
    }));
    
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'flex';
    document.getElementById('loading-text').innerText = "UPLOADING STATE DATA TO CLOUD...";
    
    setTimeout(() => { location.reload(); }, 2000);
};

window.closeManage = () => { document.getElementById('management-window').style.display = "none"; };
window.randomizeJump = () => { const r = gameState.territories[Math.floor(Math.random()*gameState.territories.length)]; if(r.latlng) selectLocation(r); };