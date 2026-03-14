// === ФАЙЛ: ui.js ===

window.getLiveScores = function() {
    let results = {}; 
    let maxTeamPower = 0;
    let majC = gameState.contracts.find(c => c.type === 'majority'); 
    let maxMajCount = 0;

    for (let id in gameState.players) {
        let p = gameState.players[id]; 
        let teamPower = p.powers.reduce((a,b) => a+b, 0);
        if (teamPower > maxTeamPower) maxTeamPower = teamPower;
        
        let dragPts = p.trophies.filter(t => t.type === 'dragon').reduce((sum, d) => sum + d.crowns, 0);
        let contPts = gameState.contracts.filter(c => c.winner === id).reduce((sum, c) => sum + c.points, 0);
        
        let majCount = 0;
        if (majC) {
            majCount = p.trophies.filter(t => t.color === majC.color).length;
            if (majCount > maxMajCount) maxMajCount = majCount;
        }
        results[id] = {id: id, name: p.name, pObj: p, teamPower: teamPower, dragPts: dragPts, contPts: contPts, trPts: 0, bonusPts: 0, total: 0, majCount: majCount};
    }

    if (majC && maxMajCount > 0) { 
        for (let id in results) {
            if (results[id].majCount === maxMajCount) results[id].contPts += majC.points; 
        }
    }

    for (let id in results) {
        let r = results[id];
        if (r.teamPower === maxTeamPower) r.bonusPts = 6;
        
        let trs = r.pObj.trophies.filter(t => t.type === 'treasure');
        let drags = r.pObj.trophies.filter(t => t.type === 'dragon');
        let eggs = r.pObj.trophies.filter(t => t.type === 'egg' || t.isEgg);

        let cRed = r.pObj.trophies.filter(t => t.color === 'red').length;
        let cGre = r.pObj.trophies.filter(t => t.color === 'green').length;
        let cYel = r.pObj.trophies.filter(t => t.color === 'yellow').length;
        let cPur = r.pObj.trophies.filter(t => t.color === 'purple').length;
        let cWhiteOrig = r.pObj.trophies.filter(t => t.isOriginallyWhite).length; 

        trs.forEach(tr => {
            if (tr.name === "Мушкет") r.trPts += Math.floor(r.teamPower / 4);
            if (tr.name === "Янтарный амулет") r.trPts += cYel;
            if (tr.name === "Желто-красный") r.trPts += Math.min(cYel, cRed) * 2;
            if (tr.name === "Драконья брошь") { let pCnts = {}; drags.forEach(d => { pCnts[d.power] = (pCnts[d.power]||0)+1; }); for (let p in pCnts) r.trPts += Math.floor(pCnts[p]/2) * 2; }
            if (tr.name === "Изумрудный") r.trPts += cGre;
            if (tr.name === "Фиолето-желтый") r.trPts += Math.min(cPur, cYel) * 2;
            if (tr.name === "Клинок") { let pCnts = {}; r.pObj.powers.forEach(p => { pCnts[p] = (pCnts[p]||0)+1; }); for(let p in pCnts) { if(pCnts[p] >= 2) r.trPts += parseInt(p); } }
            if (tr.name === "Кубок") r.trPts += trs.length;
            if (tr.name === "Корона") r.trPts += gameState.contracts.filter(c => c.winner === r.id).length * 3;
            if (tr.name === "Маска") r.trPts += 3;
            if (tr.name === "Рюкзак") r.trPts += eggs.length;
            if (tr.name === "Аметистовый") r.trPts += cPur;
            if (tr.name === "Скрижаль") { 
                let dRed = drags.filter(d => d.color === 'red').length; let eRed = eggs.filter(e => e.color === 'red').length;
                let dGre = drags.filter(d => d.color === 'green').length; let eGre = eggs.filter(e => e.color === 'green').length;
                let dYel = drags.filter(d => d.color === 'yellow').length; let eYel = eggs.filter(e => e.color === 'yellow').length;
                let dPur = drags.filter(d => d.color === 'purple').length; let ePur = eggs.filter(e => e.color === 'purple').length;
                r.trPts += (Math.min(dRed, eRed) + Math.min(dGre, eGre) + Math.min(dYel, eYel) + Math.min(dPur, ePur)) * 2; 
            }
            if (tr.name === "Древний фолиант") r.trPts += Math.floor(trs.length / 5) * 6;
            if (tr.name === "Красно-зеленый") r.trPts += Math.min(cRed, cGre) * 2;
            if (tr.name === "Зел-Фиолетовый") r.trPts += Math.min(cGre, cPur) * 2;
            if (tr.name === "Драконий череп") r.trPts += Math.floor(drags.length / 3) * 2;
            if (tr.name === "Рубиновый") r.trPts += cRed;
            if (tr.name === "Призма") r.trPts += Math.min(cRed, cGre, cYel, cPur) * 5;
            if (tr.name === "Глобус") { 
                let contractsWon = gameState.contracts.filter(c => c.winner === r.id).length;
                if (majC && r.majCount === maxMajCount && maxMajCount > 0) contractsWon++;
                if (contractsWon >= 3) r.trPts += 6; else if (contractsWon === 2) r.trPts += 3;
            }
            if (tr.name === "Скарабей") { 
                let m = 0; if(cRed === 0) m++; if(cGre === 0) m++; if(cYel === 0) m++; if(cPur === 0) m++; if(cWhiteOrig === 0) m++; 
                r.trPts += m * 3;
            }
            if (tr.name === "Песочные часы") r.trPts += Math.floor(eggs.length / 5) * 6;
        });
        r.total = r.dragPts + r.contPts + r.trPts + r.bonusPts;
    }
    return results;
};

window.calculateFinalScores = function() {
    let scoresDict = window.getLiveScores(); 
    let results = Object.values(scoresDict);
    results.sort((a,b) => b.total - a.total); 
    let html = '';
    results.forEach(r => { 
        html += `<tr><td style="font-weight:bold; color:var(--team-${r.id});">${r.name}</td><td>${r.teamPower}</td><td>${r.dragPts}</td><td>${r.contPts}</td><td>${r.trPts}</td><td>+${r.bonusPts}</td><td class="total-col">${r.total}</td></tr>`; 
    });
    document.getElementById('score-body').innerHTML = html; 
    document.getElementById('score-modal').style.display = 'block';
};

window.renderInventories = function() {
    let currentScores = window.getLiveScores(); 
    let html = '';
    
    for (let [id, p] of Object.entries(gameState.players)) {
        let stacks = { red: [], green: [], yellow: [], purple: [], white: [], treasures: [] };
        p.trophies.forEach(t => { if (t.type === 'treasure') stacks.treasures.push(t); if (t.color) stacks[t.color].push(t); });

        let stacksHtml = '';
        ['red', 'green', 'yellow', 'purple', 'white'].forEach(color => {
            if (stacks[color].length === 0) return;
            let cardsHtml = '';
            stacks[color].forEach((item, index) => {
                let isW = (color === 'white' && id === 'blue') ? 'cursor:pointer;' : '';
                let clk = (color === 'white' && id === 'blue') ? `onclick="window.openColorModal(${index})"` : '';
                if (item.type === 'dragon') cardsHtml += `<div class="card ${color}" style="${isW}" ${clk}><div class="crowns">👑${item.crowns}</div><div class="power">${item.power}</div></div>`;
                else if (item.type === 'egg' || item.isEgg) cardsHtml += `<div class="card ${color} egg-card" style="${isW}" ${clk}><div class="card-title" style="margin-top:30px;">Яйцо</div></div>`;
            });
            stacksHtml += `<div class="stack" title="${color === 'white' && id === 'blue' ? 'Кликни, чтобы перекрасить!' : ''}">${cardsHtml}</div>`;
        });

        let trHtml = ''; 
        stacks.treasures.forEach(tr => { trHtml += `<div class="mini-treasure" title="${tr.desc}">${tr.short}<span>${tr.name}</span></div>`; });
        let capHtml = p.captain ? `<div class="inv-captain" title="${p.captain.desc}">⚓ ${p.captain.name}</div>` : '';
        let scoreDisplay = `<span style="color:#f1c40f; font-weight:bold; margin-left:15px; font-size:20px;" title="Текущий счет">👑 ${currentScores[id].total}</span>`;

        html += `
        <div class="inv-panel inv-${id}">
            <div><b style="font-size:18px;">${p.name}</b> ${scoreDisplay}<br><span style="color:#bdc3c7; font-size:12px;">Сила: ${p.powers.join(', ')}</span><br>${capHtml}</div>
            <div class="trophies-container">${stacksHtml}<div class="treasure-stack">${trHtml}</div></div>
        </div>`;
    }
    document.getElementById('inventories-board').innerHTML = html;
};

window.renderContracts = function() {
    let html = '';
    gameState.contracts.forEach(c => {
        let marker = c.winner ? `<div class="hunter-disk team-${c.winner}" style="width:30px; height:30px; position:absolute; top:-10px; right:-10px; font-size:14px;">✔</div>` : '';
        let trHtml = c.treasure ? `<div class="treasure-attach" title="${c.treasure.desc}">${c.treasure.short}</div>` : '';
        html += `<div class="contract" style="${c.winner ? 'opacity:0.6;' : ''}">${marker}<div>${c.title}</div><div class="req ${c.color}">${c.points} 👑</div>${trHtml}</div>`;
    });
    document.getElementById('contracts-board').innerHTML = html;
};

window.renderBoard = function() {
    const allBps = {
        A: { dragCount: 2, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усил.", b: 'upgrade'}, {t: "💎 Сокр.", b: 'loot_tr'}] },
        B: { dragCount: 2, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усил.", b: 'upgrade'}, {t: "🥚 Яйцо", b: 'loot_egg'}, {t: "💎 Сокр.", b: 'loot_tr'}] },
        V: { dragCount: 2, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усил.", b: 'upgrade'}, {t: "🥚 Яйцо", b: 'loot_egg'}, {t: "💎 Сокр.", b: 'loot_tr'}] },
        G: { dragCount: 3, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усил.", b: 'upgrade'}, {t: "🥚 Яйцо", b: 'loot_egg'}, {t: "🥚 Яйцо", b: 'loot_egg'}, {t: "💎 Сокр.", b: 'loot_tr'}] }
    };
    
    let activeBps = [];
    if (gameState.botCount === 1) activeBps = [allBps.A, allBps.B, allBps.V]; 
    if (gameState.botCount === 2) activeBps = [allBps.A, allBps.B, allBps.G]; 
    if (gameState.botCount === 3) activeBps = [allBps.A, allBps.B, allBps.V, allBps.G]; 

    let html = ''; 
    let currDeck = gameState.round < 4 ? decks.d1 : decks.d2;

    activeBps.forEach((loc, locIndex) => {
        let dragonsHtml = '';
        for (let i=0; i<loc.dragCount; i++) {
            if (currDeck.length === 0) break; 
            let d = currDeck.pop();
            dragonsHtml += `<div class="card dragon-card ${d.color}" data-loc="${locIndex}" data-power="${d.power}" data-basepower="${d.power}" data-color="${d.color}" data-crowns="${d.crowns}"><div class="crowns">👑${d.crowns}</div><div class="power">${d.power}</div></div>`;
        }
        
        let slotsHtml = '';
        loc.slots.forEach((slot, slotIndex) => {
            let isLoot = slot.b.startsWith('loot'); 
            let inner = isLoot ? '' : `<div style="font-weight:bold; color:#bdc3c7; z-index:2; position:relative;">${slot.t}</div>`;
            let extraData = `data-bonus="${slot.b}"`;
            
            if (slot.b === 'loot_egg' && decks.eggs.length > 0) {
                let egg = decks.eggs.pop(); inner += `<div class="card ${egg.color} egg-card" style="position:absolute; width:65px; height:90px; z-index:1;"><div class="card-title" style="margin-top:35px;">Яйцо</div></div>`; extraData += ` data-obj='${JSON.stringify(egg)}'`;
            } else if (slot.b === 'loot_tr' && decks.treasures.length > 0) {
                let tr = decks.treasures.pop(); inner += `<div class="card treasure-card" title="${tr.desc}" style="position:absolute; width:65px; height:90px; z-index:1;"><div style="font-size:16px; margin-top:10px;">${tr.short}</div><div class="card-title" style="font-size:8px;">${tr.name}</div></div>`; extraData += ` data-obj='${JSON.stringify(tr)}'`;
            } else if (isLoot) inner = `<div style="color:#7f8c8d; font-size:10px;">Пусто</div>`; 
            
            slotsHtml += `<div class="slot" id="slot-${locIndex}-${slotIndex}" ${extraData} onclick="window.placeDisk(this, ${locIndex})">${inner}</div>`;
        });
        html += `<div class="location" id="loc-${locIndex}"><div class="dragons-area">${dragonsHtml}</div><div class="slots-area">${slotsHtml}</div></div>`;
    });
    document.getElementById('game-board').innerHTML = html; 
    window.renderHand();
};

window.renderHand = function() {
    let html = '';
    gameState.players.blue.powers.forEach((power, index) => {
        if (gameState.players.blue.avail[index]) {
            html += `<div class="hunter-disk team-blue" style="position:relative;" data-index="${index}" data-power="${power}" onclick="window.selectDisk(this)">${power}</div>`;
        }
    });
    document.getElementById('player-disks').innerHTML = html;
};

window.logMsg = function(text, type="") {
    const logBox = document.getElementById('battle-log'); 
    logBox.style.display = 'block';
    logBox.innerHTML += `<p class="${type}">${text}</p>`; 
    logBox.scrollTop = logBox.scrollHeight;
};

window.showGenericModal = function(title, desc, htmlContent) {
    return new Promise(resolve => {
        document.getElementById('gm-title').innerText = title;
        document.getElementById('gm-desc').innerText = desc;
        document.getElementById('gm-content').innerHTML = htmlContent;
        document.getElementById('generic-modal').style.display = 'block';
        window.resolveGeneric = function(val) { document.getElementById('generic-modal').style.display = 'none'; resolve(val); };
        document.getElementById('gm-cancel').onclick = function() { document.getElementById('generic-modal').style.display = 'none'; resolve(null); };
    });
};

// УПРАВЛЕНИЕ МОДАЛКАМИ ИГРОКА
let upgradeResolve = null;
window.showUpgradeModal = function(teamId) {
    return new Promise(resolve => {
        upgradeResolve = resolve;
        let availIndices = gameState.players[teamId].avail.map((a, i) => a ? i : -1).filter(i => i !== -1);
        if (availIndices.length === 0) { resolve(); return; } 
        let html = '';
        availIndices.forEach(i => { html += `<div class="hunter-disk team-blue" style="position:relative; cursor:pointer;" onclick="window.applyUpgrade(${i})">${gameState.players[teamId].powers[i]}</div>`; });
        document.getElementById('upgrade-options').innerHTML = html; 
        document.getElementById('upgrade-modal').style.display = 'block';
    });
};

window.applyUpgrade = function(index) {
    gameState.players.blue.powers[index]++; 
    document.getElementById('upgrade-modal').style.display = 'none';
    window.renderInventories(); 
    if (upgradeResolve) upgradeResolve();
};

window.cancelUpgrade = function() { 
    document.getElementById('upgrade-modal').style.display = 'none'; 
    if (upgradeResolve) upgradeResolve(); 
};

let swapState = { active: false, resolveFunc: null, selected: [] };
window.startSwap = function(locIndex) {
    return new Promise(resolve => {
        let loc = document.getElementById(`loc-${locIndex}`);
        let dragons = loc.querySelectorAll('.dragon-card');
        if (dragons.length < 2) { resolve(); return; }
        
        document.getElementById('action-header').style.display = 'block';
        document.getElementById('action-header').innerHTML = `Выберите 2 драконов для обмена или <button onclick="window.cancelSwap()" style="margin-left:15px; cursor:pointer;">Отказаться</button>`;
        loc.classList.add('swap-mode'); 
        swapState = { active: true, resolveFunc: resolve, selected: [], dragonsList: dragons, locElement: loc };
        
        dragons.forEach(d => {
            d.onclick = function() {
                if (!swapState.active) return;
                this.classList.toggle('swap-selected');
                if (this.classList.contains('swap-selected')) swapState.selected.push(this); else swapState.selected = swapState.selected.filter(el => el !== this);
                if (swapState.selected.length === 2) {
                    let parent = swapState.selected[0].parentNode;
                    let n1 = swapState.selected[0]; let n2 = swapState.selected[1]; let s1 = n1.nextSibling === n2 ? n1 : n1.nextSibling;
                    n2.parentNode.insertBefore(n1, n2); parent.insertBefore(n2, s1);
                    window.endSwapUI();
                }
            };
        });
    });
};

window.cancelSwap = function() { if (swapState.active) window.endSwapUI(); };
window.endSwapUI = function() {
    swapState.active = false; 
    swapState.selected.forEach(el => el.classList.remove('swap-selected'));
    swapState.locElement.classList.remove('swap-mode'); 
    swapState.dragonsList.forEach(d => d.onclick = null);
    document.getElementById('action-header').style.display = 'none'; 
    swapState.resolveFunc();
};

let pendingWhiteIndex = null;
window.openColorModal = function(index) { 
    if (gameState.isActionPaused) return; 
    pendingWhiteIndex = index; 
    document.getElementById('color-modal').style.display = 'block'; 
};

window.applyColor = function(newColor) {
    let whites = gameState.players.blue.trophies.filter(t => t.color === 'white');
    if (whites[pendingWhiteIndex]) whites[pendingWhiteIndex].color = newColor; 
    document.getElementById('color-modal').style.display = 'none';
    window.renderInventories(); 
    window.checkContractsInstant('blue'); 
};

document.getElementById('color-cancel-btn').onclick = function(){ 
    document.getElementById('color-modal').style.display = 'none'; 
};
