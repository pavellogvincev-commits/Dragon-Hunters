const colors = ['red', 'green', 'yellow', 'purple'];
const delay = ms => new Promise(res => setTimeout(res, ms));

let gameState = {
    round: 1, 
    maxRounds: 5, 
    disksPlaced: 0, 
    totalDisksRound: 0,
    players: {}, 
    contracts: [], 
    isActionPaused: false, 
    botCount: 0
};

let turnOrder = [];
let firstPlayerIndex = 0; 
let currentTurnIndex = 0;

const treasuresDb = [
    { type: 'treasure', name: "Мушкет", short: "👑/4💪", desc: "1 корона за каждые 4 силы всех ваших драконьеров" },
    { type: 'treasure', name: "Янтарный амулет", short: "👑/🟡", desc: "1 корона за каждый ЖЕЛТЫЙ цвет (драконы+яйца)" },
    { type: 'treasure', name: "Желто-красный", short: "2👑/🟡🔴", desc: "2 короны за каждую пару (Желтый + Красный цвет)" },
    { type: 'treasure', name: "Драконья брошь", short: "2👑/==", desc: "2 очка за пару драконов одинаковой силы" },
    { type: 'treasure', name: "Изумрудный", short: "👑/🟢", desc: "1 корона за каждый ЗЕЛЕНЫЙ цвет" },
    { type: 'treasure', name: "Фиолето-желтый", short: "2👑/🟣🟡", desc: "2 короны за пару (Фиолетовый + Желтый цвет)" },
    { type: 'treasure', name: "Белое яйцо", short: "🥚/⚪", desc: "Считается яйцом и сокровищем. Можно перекрасить", isEgg: true, color: 'white', isOriginallyWhite: true },
    { type: 'treasure', name: "Клинок", short: "💪=👑", desc: "Очки за драконьеров одинаковой силы" },
    { type: 'treasure', name: "Кубок", short: "👑/🎁", desc: "1 корона за каждое сокровище" },
    { type: 'treasure', name: "Корона", short: "3👑/📜", desc: "3 короны за каждый выполненный контракт" },
    { type: 'treasure', name: "Маска", short: "+3 👑", desc: "Дает 3 короны просто так" },
    { type: 'treasure', name: "Рюкзак", short: "👑/🥚", desc: "1 корона за каждое яйцо" },
    { type: 'treasure', name: "Аметистовый", short: "👑/🟣", desc: "1 корона за каждый ФИОЛЕТОВЫЙ цвет" },
    { type: 'treasure', name: "Скрижаль", short: "2👑/🐉🥚", desc: "2 короны за пару (Дракон + Яйцо) ОДНОГО цвета" },
    { type: 'treasure', name: "Древний фолиант", short: "6👑/5🎁", desc: "6 корон за каждые 5 сокровищ" },
    { type: 'treasure', name: "Красно-зеленый", short: "2👑/🔴🟢", desc: "2 короны за пару (Красный + Зеленый цвет)" },
    { type: 'treasure', name: "Зел-Фиолетовый", short: "2👑/🟢🟣", desc: "2 короны за пару (Зеленый + Фиолетовый цвет)" },
    { type: 'treasure', name: "Драконий череп", short: "2👑/3🐉", desc: "2 короны за любых 3 пойманных дракона" },
    { type: 'treasure', name: "Рубиновый", short: "👑/🔴", desc: "1 корона за каждый КРАСНЫЙ цвет" },
    { type: 'treasure', name: "Призма", short: "5👑/🌈", desc: "5 корон за набор из 4 разных цветов" },
    { type: 'treasure', name: "Глобус", short: "3-6👑/📜", desc: "3 короны за 2 выполненных контракта, 6 корон за 3" },
    { type: 'treasure', name: "Скарабей", short: "3👑/🚫ЦВЕТ", desc: "3 короны за каждый цвет племени (включая белый), которого у вас НЕТ" },
    { type: 'treasure', name: "Песочные часы", short: "6👑/5🥚", desc: "6 корон за каждые 5 яиц" }
];

let decks = { d1: [], d2: [], eggs: [], treasures: [] };

function shuffle(arr) { 
    for (let i = arr.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [arr[i], arr[j]] = [arr[j], arr[i]]; 
    } 
    return arr; 
}

// === ИНИЦИАЛИЗАЦИЯ ИГРЫ ===
window.startGame = function(botCount) {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';

    gameState.botCount = botCount;
    let totalPlayers = botCount + 1;
    gameState.totalDisksRound = totalPlayers * 3;

    gameState.players = { blue: { name: 'Вы', isBot: false, powers: [1,2,3], avail: [true,true,true], trophies: [] } };
    turnOrder = ['blue'];

    if (botCount >= 1) { 
        gameState.players.red = { name: 'Бот 1 (Красный)', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] }; 
        turnOrder.push('red'); 
    }
    if (botCount >= 2) { 
        gameState.players.green = { name: 'Бот 2 (Зеленый)', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] }; 
        turnOrder.push('green'); 
    }
    if (botCount >= 3) { 
        gameState.players.purple = { name: 'Бот 3 (Фиолет)', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] }; 
        turnOrder.push('purple'); 
    }

    initDecks(); 
    generateContracts(); 
    startRound();
};

function initDecks() {
    colors.forEach(c => {
        decks.d1.push(
            {type:'dragon', color: c, power: 3, crowns: 1}, {type:'dragon', color: c, power: 3, crowns: 1},
            {type:'dragon', color: c, power: 4, crowns: 2}, {type:'dragon', color: c, power: 4, crowns: 2},
            {type:'dragon', color: c, power: 5, crowns: 3}, {type:'dragon', color: c, power: 6, crowns: 4}
        );
    });
    decks.d1.push(
        {type:'dragon', color: 'white', power: 4, crowns: 1}, 
        {type:'dragon', color: 'white', power: 4, crowns: 1}, 
        {type:'dragon', color: 'white', power: 6, crowns: 2}
    );
    shuffle(decks.d1);

    colors.forEach(c => {
        decks.d2.push(
            {type:'dragon', color: c, power: 5, crowns: 3}, {type:'dragon', color: c, power: 6, crowns: 4},
            {type:'dragon', color: c, power: 8, crowns: 5}, {type:'dragon', color: c, power: 10, crowns: 6}
        );
    });
    decks.d2.push({type:'dragon', color: 'white', power: 6, crowns: 2}, {type:'dragon', color: 'white', power: 6, crowns: 2});
    shuffle(decks.d2);

    colors.forEach(c => { 
        for(let i=0; i<5; i++) decks.eggs.push({type:'egg', color: c}); 
    });
    shuffle(decks.eggs);
    
    decks.treasures = shuffle(JSON.parse(JSON.stringify(treasuresDb)));
}

// === ПОДСЧЕТ ОЧКОВ ===
function getLiveScores() {
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

        results[id] = {id, name: p.name, pObj: p, teamPower, dragPts, contPts, trPts: 0, bonusPts: 0, total: 0, majCount};
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
            if (tr.name === "Драконья брошь") { 
                let pCnts = {}; 
                drags.forEach(d => { pCnts[d.power] = (pCnts[d.power]||0)+1; }); 
                for (let p in pCnts) r.trPts += Math.floor(pCnts[p]/2)*2; 
            }
            if (tr.name === "Изумрудный") r.trPts += cGre;
            if (tr.name === "Фиолето-желтый") r.trPts += Math.min(cPur, cYel)*2;
            if (tr.name === "Белое яйцо") r.trPts += 0; 
            if (tr.name === "Клинок") { 
                let pCnts = {}; 
                r.pObj.powers.forEach(p => { pCnts[p] = (pCnts[p]||0)+1; }); 
                for(let p in pCnts) if(pCnts[p] >= 2) r.trPts += parseInt(p); 
            }
            if (tr.name === "Кубок") r.trPts += trs.length;
            if (tr.name === "Корона") r.trPts += gameState.contracts.filter(c => c.winner === r.id).length * 3;
            if (tr.name === "Маска") r.trPts += 3;
            if (tr.name === "Рюкзак") r.trPts += eggs.length;
            if (tr.name === "Аметистовый") r.trPts += cPur;
            if (tr.name === "Скрижаль") { 
                let dRed = drags.filter(d => d.color === 'red').length, eRed = eggs.filter(e => e.color === 'red').length;
                let dGre = drags.filter(d => d.color === 'green').length, eGre = eggs.filter(e => e.color === 'green').length;
                let dYel = drags.filter(d => d.color === 'yellow').length, eYel = eggs.filter(e => e.color === 'yellow').length;
                let dPur = drags.filter(d => d.color === 'purple').length, ePur = eggs.filter(e => e.color === 'purple').length;
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
                if (contractsWon >= 3) r.trPts += 6;
                else if (contractsWon === 2) r.trPts += 3;
            }
            
            if (tr.name === "Скарабей") { 
                let missingColors = 0;
                if (cRed === 0) missingColors++;
                if (cGre === 0) missingColors++;
                if (cYel === 0) missingColors++;
                if (cPur === 0) missingColors++;
                if (cWhiteOrig === 0) missingColors++; 
                r.trPts += missingColors * 3;
            }
            if (tr.name === "Песочные часы") r.trPts += Math.floor(eggs.length / 5) * 6;
        });
        r.total = r.dragPts + r.contPts + r.trPts + r.bonusPts;
    }
    return results;
}

// === ОТРИСОВКА ===
function renderInventories() {
    let currentScores = getLiveScores(); 
    let html = '';
    
    for (let [id, p] of Object.entries(gameState.players)) {
        let stacks = { red: [], green: [], yellow: [], purple: [], white: [], treasures: [] };
        
        p.trophies.forEach(t => { 
            if (t.type === 'treasure') stacks.treasures.push(t); 
            if (t.color) stacks[t.color].push(t); 
        });

        let stacksHtml = '';
        ['red', 'green', 'yellow', 'purple', 'white'].forEach(color => {
            if (stacks[color].length === 0) return;
            let cardsHtml = '';
            
            stacks[color].forEach((item, index) => {
                let isW = (color === 'white' && id === 'blue') ? 'cursor:pointer;' : '';
                let clk = (color === 'white' && id === 'blue') ? `onclick="openColorModal(${index})"` : '';
                
                if (item.type === 'dragon') {
                    cardsHtml += `<div class="card ${color}" style="${isW}" ${clk}><div class="crowns">👑${item.crowns}</div><div class="power">${item.power}</div></div>`;
                } else if (item.type === 'egg' || item.isEgg) {
                    cardsHtml += `<div class="card ${color} egg-card" style="${isW}" ${clk}><div class="card-title" style="margin-top:30px;">Яйцо</div></div>`;
                }
            });
            stacksHtml += `<div class="stack" title="${color === 'white' && id === 'blue' ? 'Кликни, чтобы перекрасить!' : ''}">${cardsHtml}</div>`;
        });

        let trHtml = '';
        stacks.treasures.forEach(tr => { 
            trHtml += `<div class="mini-treasure" title="${tr.desc}">${tr.short}<span>${tr.name}</span></div>`; 
        });

        let scoreDisplay = `<span style="color:#f1c40f; font-weight:bold; margin-left:15px; font-size:20px;" title="Текущий счет">👑 ${currentScores[id].total}</span>`;

        html += `
        <div class="inv-panel inv-${id}">
            <div>
                <b style="font-size:18px;">${p.name}</b> ${scoreDisplay}<br>
                <span style="color:#bdc3c7; font-size:12px;">Сила: ${p.powers.join(', ')}</span>
            </div>
            <div class="trophies-container">
                ${stacksHtml}
                <div class="treasure-stack">${trHtml}</div>
            </div>
        </div>`;
    }
    document.getElementById('inventories-board').innerHTML = html;
}

function generateContracts() {
    let cColors = shuffle([...colors]); 
    gameState.contracts = [
        { title: "Собрать 3", req: 3, points: 4, color: cColors[0], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Собрать 4", req: 4, points: 6, color: cColors[1], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Собрать 5", req: 5, points: 9, color: cColors[2], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Больше всех", req: 0, points: 10, color: cColors[3], type: "majority", treasure: null, winner: null }
    ];
    renderContracts();
}

function renderContracts() {
    let html = '';
    gameState.contracts.forEach(c => {
        let marker = c.winner ? `<div class="hunter-disk team-${c.winner}" style="width:30px; height:30px; position:absolute; top:-10px; right:-10px; font-size:14px;">✔</div>` : '';
        let trHtml = c.treasure ? `<div class="treasure-attach" title="${c.treasure.desc}">${c.treasure.short}</div>` : '';
        html += `<div class="contract" style="${c.winner ? 'opacity:0.6;' : ''}">${marker}<div>${c.title}</div><div class="req ${c.color}">${c.points} 👑</div>${trHtml}</div>`;
    });
    document.getElementById('contracts-board').innerHTML = html;
}

function checkContractsInstant(teamId) {
    let changed = false;
    gameState.contracts.forEach(c => {
        if (c.winner || c.type === 'majority') return; 
        
        let count = gameState.players[teamId].trophies.filter(t => t.color === c.color).length;
        if (count >= c.req) {
            c.winner = teamId;
            if (c.treasure) {
                gameState.players[teamId].trophies.push(c.treasure);
                c.treasure = null;
            }
            logMsg(`🏆 ${gameState.players[teamId].name} выполнил контракт "${c.title}"!`, 'log-move');
            changed = true;
        }
    });
    if (changed) { 
        renderContracts(); 
        renderInventories(); 
    }
}

// === ВЗАИМОДЕЙСТВИЕ ===
let pendingWhiteIndex = null;
window.openColorModal = function(index) {
    if (gameState.isActionPaused) return;
    pendingWhiteIndex = index; 
    document.getElementById('color-modal').style.display = 'block';
};

window.applyColor = function(newColor) {
    let whites = gameState.players.blue.trophies.filter(t => t.color === 'white');
    if (whites[pendingWhiteIndex]) {
        whites[pendingWhiteIndex].color = newColor; 
    }
    document.getElementById('color-modal').style.display = 'none';
    renderInventories(); 
    checkContractsInstant('blue'); 
};

function botRecolorWhite(team) {
    let whites = gameState.players[team].trophies.filter(t => t.color === 'white');
    if (whites.length === 0) return;

    let changed = false;
    whites.forEach(w => {
        let chosenColor = colors[Math.floor(Math.random() * colors.length)]; 
        
        for (let c of gameState.contracts) {
            if (!c.winner && c.type !== 'majority') {
                let count = gameState.players[team].trophies.filter(t => t.color === c.color).length;
                if (count + 1 >= c.req) { 
                    chosenColor = c.color; 
                    break; 
                }
            }
        }
        w.color = chosenColor;
        changed = true;
        logMsg(`🤖 ${gameState.players[team].name} перекрасил белую карту в ${chosenColor}!`, "log-move");
    });
    
    if (changed) { 
        renderInventories(); 
        checkContractsInstant(team); 
    }
}

function startRound() {
    gameState.disksPlaced = 0;
    firstPlayerIndex = (gameState.round - 1) % turnOrder.length; 
    currentTurnIndex = firstPlayerIndex;
    
    for (let id in gameState.players) {
        gameState.players[id].avail = [true, true, true];
    }
    document.getElementById('action-header').style.display = 'none';
    
    renderInventories(); 
    renderBoard();
    
    let activeTeam = turnOrder[currentTurnIndex];
    document.getElementById('round-info').innerText = activeTeam === 'blue' ? `Раунд ${gameState.round}/5 | Ваш ход (Вы первый!)` : `Раунд ${gameState.round}/5 | Начинает ${gameState.players[activeTeam].name}...`;
    
    if (gameState.players[activeTeam].isBot) {
        setTimeout(() => botTurn(activeTeam), 1000);
    }
}

function nextTurn() {
    if (gameState.disksPlaced >= gameState.totalDisksRound) {
        document.getElementById('round-info').innerText = "Засада окончена! Начинается прорыв!";
        document.getElementById('resolve-btn').style.display = 'block'; 
        return;
    }
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
    let activeTeam = turnOrder[currentTurnIndex];
    document.getElementById('round-info').innerText = activeTeam === 'blue' ? `Ваш ход (Выберите диск)` : `${gameState.players[activeTeam].name} делает ход...`;
    
    if (gameState.players[activeTeam].isBot) {
        setTimeout(() => botTurn(activeTeam), 1000);
    }
}

function renderBoard() {
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
                let egg = decks.eggs.pop();
                inner += `<div class="card ${egg.color} egg-card" style="position:absolute; width:65px; height:90px; z-index:1;"><div class="card-title" style="margin-top:35px;">Яйцо</div></div>`;
                extraData += ` data-obj='${JSON.stringify(egg)}'`;
            } else if (slot.b === 'loot_tr' && decks.treasures.length > 0) {
                let tr = decks.treasures.pop();
                inner += `<div class="card treasure-card" title="${tr.desc}" style="position:absolute; width:65px; height:90px; z-index:1;"><div style="font-size:16px; margin-top:10px;">${tr.short}</div><div class="card-title" style="font-size:8px;">${tr.name}</div></div>`;
                extraData += ` data-obj='${JSON.stringify(tr)}'`;
            } else if (isLoot) {
                inner = `<div style="color:#7f8c8d; font-size:10px;">Пусто</div>`; 
            }
            
            slotsHtml += `<div class="slot" id="slot-${locIndex}-${slotIndex}" ${extraData} onclick="placeDisk(this, ${locIndex})">${inner}</div>`;
        });
        html += `<div class="location" id="loc-${locIndex}"><div class="dragons-area">${dragonsHtml}</div><div class="slots-area">${slotsHtml}</div></div>`;
    });
    
    document.getElementById('game-board').innerHTML = html; 
    renderHand();
}

function renderHand() {
    let html = '';
    gameState.players.blue.powers.forEach((power, index) => {
        if (gameState.players.blue.avail[index]) {
            html += `<div class="hunter-disk team-blue" style="position:relative;" data-index="${index}" data-power="${power}" onclick="selectDisk(this)">${power}</div>`;
        }
    });
    document.getElementById('player-disks').innerHTML = html;
}

let selectedDisk = null;

window.selectDisk = function(element) {
    if (gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue') return;
    document.querySelectorAll('.hunter-disk').forEach(el => el.classList.remove('selected'));
    selectedDisk = element; 
    element.classList.add('selected');
};

window.placeDisk = async function(slotElement, locIndex) {
    if (gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue' || !selectedDisk || slotElement.querySelector('.hunter-disk')) return;
    
    let dIndex = selectedDisk.dataset.index; 
    gameState.players.blue.avail[dIndex] = false; 
    
    selectedDisk.classList.remove('selected'); 
    selectedDisk.style.position = 'absolute'; 
    selectedDisk.dataset.team = 'blue';
    slotElement.appendChild(selectedDisk); 
    selectedDisk = null;
    
    let bonus = slotElement.dataset.bonus;
    if (bonus && bonus.startsWith('loot') && slotElement.dataset.obj) {
        gameState.players.blue.trophies.push(JSON.parse(slotElement.dataset.obj));
        let c = slotElement.querySelector('.card'); 
        if (c) c.remove();
        
        renderInventories(); 
        checkContractsInstant('blue'); 
        finalizePlayerTurn();
    } else if (bonus === 'upgrade') {
        gameState.isActionPaused = true; 
        showUpgradeModal('blue').then(() => finalizePlayerTurn());
    } else if (bonus === 'swap') {
        gameState.isActionPaused = true; 
        startSwap(locIndex).then(() => finalizePlayerTurn());
    } else {
        finalizePlayerTurn();
    }
};

function finalizePlayerTurn() {
    gameState.isActionPaused = false; 
    document.getElementById('action-header').style.display = 'none';
    gameState.disksPlaced++; 
    renderHand(); 
    nextTurn();
}

let upgradeResolve = null;

function showUpgradeModal(teamId) {
    return new Promise(resolve => {
        upgradeResolve = resolve;
        let availIndices = gameState.players[teamId].avail.map((a, i) => a ? i : -1).filter(i => i !== -1);
        if (availIndices.length === 0) { 
            resolve(); 
            return; 
        } 
        let html = '';
        availIndices.forEach(i => { 
            html += `<div class="hunter-disk team-blue" style="position:relative; cursor:pointer;" onclick="applyUpgrade(${i})">${gameState.players[teamId].powers[i]}</div>`; 
        });
        document.getElementById('upgrade-options').innerHTML = html; 
        document.getElementById('upgrade-modal').style.display = 'block';
    });
}

window.applyUpgrade = function(index) {
    gameState.players.blue.powers[index]++; 
    document.getElementById('upgrade-modal').style.display = 'none';
    renderInventories(); 
    upgradeResolve();
};

window.cancelUpgrade = function() { 
    document.getElementById('upgrade-modal').style.display = 'none'; 
    upgradeResolve(); 
};

let swapState = { active: false, resolveFunc: null, selected: [] };

function startSwap(locIndex) {
    return new Promise(resolve => {
        let loc = document.getElementById(`loc-${locIndex}`);
        let dragons = loc.querySelectorAll('.dragon-card');
        if (dragons.length < 2) { 
            resolve(); 
            return; 
        }
        
        let header = document.getElementById('action-header'); 
        header.style.display = 'block';
        header.innerHTML = `Нажмите на 2 драконов для обмена или <button onclick="cancelSwap()" style="margin-left:15px; cursor:pointer;">Отказаться</button>`;
        loc.classList.add('swap-mode'); 
        swapState = { active: true, resolveFunc: resolve, selected: [], dragonsList: dragons, locElement: loc };
        
        dragons.forEach(d => {
            d.onclick = function() {
                if (!swapState.active) return;
                
                this.classList.toggle('swap-selected');
                
                if (this.classList.contains('swap-selected')) {
                    swapState.selected.push(this);
                } else {
                    swapState.selected = swapState.selected.filter(el => el !== this);
                }
                
                if (swapState.selected.length === 2) {
                    let parent = swapState.selected[0].parentNode;
                    let n1 = swapState.selected[0];
                    let n2 = swapState.selected[1];
                    let s1 = n1.nextSibling === n2 ? n1 : n1.nextSibling;
                    
                    n2.parentNode.insertBefore(n1, n2); 
                    parent.insertBefore(n2, s1);
                    endSwapUI();
                }
            };
        });
    });
}

window.cancelSwap = function() { 
    if (swapState.active) endSwapUI(); 
};

function endSwapUI() {
    swapState.active = false; 
    swapState.selected.forEach(el => el.classList.remove('swap-selected'));
    swapState.locElement.classList.remove('swap-mode'); 
    swapState.dragonsList.forEach(d => d.onclick = null);
    document.getElementById('action-header').style.display = 'none'; 
    swapState.resolveFunc();
}

function botTurn(team) {
    let emptySlots = Array.from(document.querySelectorAll('.slot')).filter(s => !s.querySelector('.hunter-disk'));
    let availIndices = gameState.players[team].avail.map((a, i) => a ? i : -1).filter(i => i !== -1);
    
    if (emptySlots.length === 0 || availIndices.length === 0) return;

    let bestMove = null; 
    let maxScore = -1;

    emptySlots.forEach(slot => {
        availIndices.forEach(dIndex => {
            let score = Math.random() * 5; 
            let power = gameState.players[team].powers[dIndex];

            if (slot.hasAttribute('data-obj')) {
                score += 8;
            }
            if (slot.dataset.bonus === 'upgrade' && gameState.players[team].powers.some(p => p < 4)) {
                score += 6;
            }

            let loc = slot.closest('.location');
            let dragons = Array.from(loc.querySelectorAll('.dragon-card'));
            
            dragons.forEach(d => {
                let dPower = parseInt(d.dataset.power);
                if (power >= dPower) {
                    score += 4; 
                    gameState.contracts.forEach(c => {
                        if (!c.winner && c.color === d.dataset.color) {
                            score += 10; 
                        }
                    });
                } else {
                    score += 2; 
                }
            });

            if (score > maxScore) { 
                maxScore = score; 
                bestMove = { slot, dIndex }; 
            }
        });
    });

    gameState.players[team].avail[bestMove.dIndex] = false;
    let diskEl = document.createElement('div');
    diskEl.className = `hunter-disk hidden-disk`; 
    diskEl.innerText = "?"; 
    diskEl.dataset.team = team; 
    diskEl.dataset.power = gameState.players[team].powers[bestMove.dIndex]; 
    diskEl.dataset.index = bestMove.dIndex;
    bestMove.slot.appendChild(diskEl);
    
    let bonus = bestMove.slot.dataset.bonus;
    if (bonus && bonus.startsWith('loot') && bestMove.slot.dataset.obj) {
        gameState.players[team].trophies.push(JSON.parse(bestMove.slot.dataset.obj));
        let c = bestMove.slot.querySelector('.card'); 
        if (c) c.remove();
        
        checkContractsInstant(team); 
        botRecolorWhite(team); 
    } else if (bonus === 'upgrade') {
        let avail = gameState.players[team].avail.findIndex(a => a === true);
        if (avail !== -1) {
            gameState.players[team].powers[avail]++; 
        }
    } else if (bonus === 'swap') {
        let loc = bestMove.slot.closest('.location'); 
        let d = Array.from(loc.querySelectorAll('.dragon-card'));
        if (d.length > 1) {
            loc.querySelector('.dragons-area').insertBefore(d[1], d[0]); 
        }
    }
    renderInventories(); 
    gameState.disksPlaced++; 
    nextTurn();
}

function logMsg(text, type="") {
    const logBox = document.getElementById('battle-log'); 
    logBox.style.display = 'block';
    logBox.innerHTML += `<p class="${type}">${text}</p>`; 
    logBox.scrollTop = logBox.scrollHeight;
}

window.resolvePhaseAsync = async function() {
    document.getElementById('resolve-btn').style.display = 'none';
    let locations = document.querySelectorAll('.location');
    
    for (let loc of locations) {
        let dragons = Array.from(loc.querySelectorAll('.dragon-card')).reverse();
        let slots = Array.from(loc.querySelectorAll('.slot'));

        for (let dCard of dragons) {
            let dPower = parseInt(dCard.dataset.power);
            let isCaught = false;
            
            dCard.classList.add('active-dragon'); 
            await delay(800); 

            for (let slot of slots) {
                let disk = slot.querySelector('.hunter-disk');
                if (disk && disk.style.opacity !== '0') {
                    slot.classList.add('active-slot'); 
                    await delay(500); 
                    
                    let hTeam = disk.dataset.team;
                    let hIndex = disk.dataset.index;
                    let hPower = parseInt(disk.dataset.power);
                    
                    if (disk.classList.contains('hidden-disk')) {
                        disk.className = `hunter-disk team-${hTeam}`; 
                        disk.innerText = hPower; 
                        await delay(700); 
                    }

                    if (hPower >= dPower) {
                        let basePower = parseInt(dCard.dataset.basepower);
                        let isOrigWhite = dCard.dataset.color === 'white';
                        
                        gameState.players[hTeam].trophies.push({
                            type: 'dragon', 
                            color: dCard.dataset.color, 
                            power: basePower, 
                            crowns: parseInt(dCard.dataset.crowns), 
                            isOriginallyWhite: isOrigWhite
                        });
                        
                        renderInventories(); 
                        dCard.style.opacity = '0'; 
                        disk.style.opacity = '0'; 
                        slot.classList.remove('active-slot');
                        logMsg(`✅ ${gameState.players[hTeam].name} ПОЙМАЛ дракона!`, "log-win");
                        
                        checkContractsInstant(hTeam);
                        if (isOrigWhite && gameState.players[hTeam].isBot) {
                            botRecolorWhite(hTeam); 
                        }
                        
                        isCaught = true; 
                        break; 
                    } else {
                        dPower -= hPower; 
                        dCard.dataset.power = dPower;
                        dCard.querySelector('.power').innerText = dPower; 
                        dCard.classList.add('clash-anim');
                        
                        gameState.players[hTeam].powers[hIndex]++; 
                        renderInventories(); 
                        logMsg(`❌ Змей ослаблен до ${dPower}. Охотник получает +1 к силе!`, "log-fail");
                        
                        await delay(700); 
                        dCard.classList.remove('clash-anim');
                        disk.style.opacity = '0'; 
                        slot.classList.remove('active-slot');
                    }
                }
            }
            if (!isCaught) { 
                dCard.style.opacity = '0.2'; 
                await delay(200); 
            }
        }
        for (let slot of slots) { 
            let disk = slot.querySelector('.hunter-disk'); 
            if (disk) disk.style.opacity = '0'; 
        }
    }
    document.getElementById('next-round-btn').style.display = 'block';
};

function calculateFinalScores() {
    let scoresDict = getLiveScores();
    let results = Object.values(scoresDict);

    results.sort((a,b) => b.total - a.total); 
    let html = '';
    results.forEach(r => { 
        html += `<tr>
            <td style="font-weight:bold; color:var(--team-${r.id});">${r.name}</td>
            <td>${r.teamPower}</td>
            <td>${r.dragPts}</td>
            <td>${r.contPts}</td>
            <td>${r.trPts}</td>
            <td>+${r.bonusPts}</td>
            <td class="total-col">${r.total}</td>
        </tr>`; 
    });
    
    document.getElementById('score-body').innerHTML = html; 
    document.getElementById('score-modal').style.display = 'block';
}

window.nextRound = function() { 
    if (gameState.round === 5) { 
        calculateFinalScores(); 
        return; 
    } 
    gameState.round++; 
    startRound(); 
};
