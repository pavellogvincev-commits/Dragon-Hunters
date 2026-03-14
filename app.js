const colors = ['red', 'green', 'yellow', 'purple'];
const delay = ms => new Promise(res => setTimeout(res, ms));

let gameState = {
    round: 1, maxRounds: 5, disksPlaced: 0, totalDisksRound: 0,
    players: {}, contracts: [], isActionPaused: false, botCount: 0,
    captainsUsedRound: { blue:false, red:false, green:false, purple:false }
};

let turnOrder = []; let firstPlayerIndex = 0; let currentTurnIndex = 0;

// Сжатая БД Капитанов
const captainsDb = [
    { id: 'corvo', name: '"Адмирал" Корво', desc: 'Засада: при размещении диска можно забрать бонус с ДРУГОЙ пустой клетки локации.', phase: 'ambush_passive' },
    { id: 'hector', name: 'Гектор "Свинцовый Шквал"', desc: 'Прокачка: Поймал = +2 силы (макс 8). Не поймал = -1 сила (мин 1).', phase: 'passive' },
    { id: 'iris', name: '"Железная" Ирис', desc: '1 раз в раунд в фазу прорыва (после вскрытия диска) можно дать ему +2 силы.', phase: 'resolve_active' },
    { id: 'eleonora', name: 'Мадам Элеонора', desc: '1 раз в раунд в фазу прорыва можно перекрасить пойманного дракона.', phase: 'resolve_active' },
    { id: 'thorvald', name: 'Торвальд "Седая Сталь"', desc: 'Если драконьер НЕ поймал дракона, его сила растет на +2 (вместо +1).', phase: 'passive' },
    { id: 'bramm', name: 'Брамм "Мёртвый узел"', desc: '1 раз в раунд в засаду: сбросьте 1 дракона, чтобы дать +X силы невыставленному диску.', phase: 'ambush_active' },
    { id: 'sylvia', name: 'Сильвия "Леди Ночь"', desc: 'Старт с силой 2,3,4. 1 раз в засаду можно подсмотреть скрытый диск.', phase: 'ambush_active' },
    { id: 'quint', name: 'Квинт "Золотой Змей"', desc: 'В засаду: -1 силы диска, чтобы мгновенно выполнить контракт без 1 карты.', phase: 'ambush_active' }
];

// Сжатая БД Сокровищ
const treasuresDb = [
    { type: 'treasure', name: "Мушкет", short: "👑/4💪", desc: "1 корона за каждые 4 силы команды" },
    { type: 'treasure', name: "Янтарный амулет", short: "👑/🟡", desc: "1 корона за каждый ЖЕЛТЫЙ цвет" },
    { type: 'treasure', name: "Желто-красный", short: "2👑/🟡🔴", desc: "2 короны за пару (Желтый + Красный)" },
    { type: 'treasure', name: "Драконья брошь", short: "2👑/==", desc: "2 очка за пару драконов одинаковой силы" },
    { type: 'treasure', name: "Изумрудный", short: "👑/🟢", desc: "1 корона за каждый ЗЕЛЕНЫЙ цвет" },
    { type: 'treasure', name: "Фиолето-желтый", short: "2👑/🟣🟡", desc: "2 короны за пару (Фиолет + Желтый)" },
    { type: 'treasure', name: "Белое яйцо", short: "🥚/⚪", desc: "Яйцо и сокр. Можно красить", isEgg: true, color: 'white', isOriginallyWhite: true },
    { type: 'treasure', name: "Клинок", short: "💪=👑", desc: "Очки за драконьеров одинаковой силы" },
    { type: 'treasure', name: "Кубок", short: "👑/🎁", desc: "1 корона за каждое сокровище" },
    { type: 'treasure', name: "Корона", short: "3👑/📜", desc: "3 короны за каждый выполненный контракт" },
    { type: 'treasure', name: "Маска", short: "+3 👑", desc: "Дает 3 короны" },
    { type: 'treasure', name: "Рюкзак", short: "👑/🥚", desc: "1 корона за каждое яйцо" },
    { type: 'treasure', name: "Аметистовый", short: "👑/🟣", desc: "1 корона за ФИОЛЕТОВЫЙ цвет" },
    { type: 'treasure', name: "Скрижаль", short: "2👑/🐉🥚", desc: "2 короны за пару Дракон+Яйцо одного цвета" },
    { type: 'treasure', name: "Древний фолиант", short: "6👑/5🎁", desc: "6 корон за каждые 5 сокровищ" },
    { type: 'treasure', name: "Красно-зеленый", short: "2👑/🔴🟢", desc: "2 короны за пару (Красный + Зеленый)" },
    { type: 'treasure', name: "Зел-Фиолетовый", short: "2👑/🟢🟣", desc: "2 короны за пару (Зеленый + Фиолет)" },
    { type: 'treasure', name: "Драконий череп", short: "2👑/3🐉", desc: "2 короны за 3 любых дракона" },
    { type: 'treasure', name: "Рубиновый", short: "👑/🔴", desc: "1 корона за КРАСНЫЙ цвет" },
    { type: 'treasure', name: "Призма", short: "5👑/🌈", desc: "5 корон за набор из 4 разных цветов" },
    { type: 'treasure', name: "Глобус", short: "3-6👑/📜", desc: "3 короны за 2 контракта, 6 корон за 3" },
    { type: 'treasure', name: "Скарабей", short: "3👑/🚫ЦВЕТ", desc: "3 короны за отсутствующий цвет" },
    { type: 'treasure', name: "Песочные часы", short: "6👑/5🥚", desc: "6 корон за 5 яиц" }
];

let decks = { d1: [], d2: [], eggs: [], treasures: [] };
function shuffle(arr) { for(let i=arr.length-1; i>0; i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }

function initDraft(botCount) {
    document.getElementById('start-screen').style.display = 'none';
    gameState.botCount = botCount;
    gameState.totalDisksRound = (botCount + 1) * 3;
    gameState.players = { blue: { name: 'Вы', isBot: false, powers: [1,2,3], avail: [true,true,true], trophies: [] } };
    turnOrder = ['blue'];
    if (botCount >= 1) { gameState.players.red = { name: 'Бот 1', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] }; turnOrder.push('red'); }
    if (botCount >= 2) { gameState.players.green = { name: 'Бот 2', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] }; turnOrder.push('green'); }
    if (botCount >= 3) { gameState.players.purple = { name: 'Бот 3', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] }; turnOrder.push('purple'); }

    let pool = shuffle([...captainsDb]);
    let opt1 = pool.pop(); let opt2 = pool.pop();
    let html = `
        <div class="captain-card" onclick="selectCaptain('blue', '${opt1.id}')"><div class="captain-title">${opt1.name}</div><div class="captain-desc">${opt1.desc}</div></div>
        <div class="captain-card" onclick="selectCaptain('blue', '${opt2.id}')"><div class="captain-title">${opt2.name}</div><div class="captain-desc">${opt2.desc}</div></div>
    `;
    document.getElementById('draft-options').innerHTML = html;
    document.getElementById('draft-screen').style.display = 'block';

    turnOrder.forEach(team => { if(team !== 'blue') gameState.players[team].captain = pool.pop(); });
}

function selectCaptain(team, capId) {
    gameState.players[team].captain = captainsDb.find(c => c.id === capId);
    document.getElementById('draft-screen').style.display = 'none';
    for(let id in gameState.players) { if(gameState.players[id].captain.id === 'sylvia') gameState.players[id].powers = [2,3,4]; }
    initDecks(); generateContracts(); startRound();
}

function initDecks() {
    colors.forEach(c => {
        decks.d1.push({type:'dragon', color:c, power:3, crowns:1}, {type:'dragon', color:c, power:3, crowns:1}, {type:'dragon', color:c, power:4, crowns:2}, {type:'dragon', color:c, power:4, crowns:2}, {type:'dragon', color:c, power:5, crowns:3}, {type:'dragon', color:c, power:6, crowns:4});
        decks.d2.push({type:'dragon', color:c, power:5, crowns:3}, {type:'dragon', color:c, power:6, crowns:4}, {type:'dragon', color:c, power:8, crowns:5}, {type:'dragon', color:c, power:10, crowns:6});
    });
    decks.d1.push({type:'dragon', color:'white', power:4, crowns:1}, {type:'dragon', color:'white', power:4, crowns:1}, {type:'dragon', color:'white', power:6, crowns:2});
    decks.d2.push({type:'dragon', color:'white', power:6, crowns:2}, {type:'dragon', color:'white', power:6, crowns:2});
    shuffle(decks.d1); shuffle(decks.d2);
    colors.forEach(c => { for(let i=0; i<5; i++) decks.eggs.push({type:'egg', color:c}); });
    shuffle(decks.eggs);
    decks.treasures = shuffle(JSON.parse(JSON.stringify(treasuresDb)));
}

function getLiveScores() {
    let results = {}; let maxTeamPower = 0;
    let majC = gameState.contracts.find(c => c.type === 'majority'); let maxMajCount = 0;

    for (let id in gameState.players) {
        let p = gameState.players[id]; let teamPower = p.powers.reduce((a,b) => a+b, 0);
        if (teamPower > maxTeamPower) maxTeamPower = teamPower;
        let dragPts = p.trophies.filter(t => t.type === 'dragon').reduce((sum, d) => sum + d.crowns, 0);
        let contPts = gameState.contracts.filter(c => c.winner === id).reduce((sum, c) => sum + c.points, 0);
        let majCount = majC ? p.trophies.filter(t => t.color === majC.color).length : 0;
        if (majCount > maxMajCount) maxMajCount = majCount;
        results[id] = {id, name: p.name, pObj: p, teamPower, dragPts, contPts, trPts: 0, bonusPts: 0, total: 0, majCount};
    }

    if (majC && maxMajCount > 0) { for (let id in results) if (results[id].majCount === maxMajCount) results[id].contPts += majC.points; }

    for (let id in results) {
        let r = results[id];
        if (r.teamPower === maxTeamPower) r.bonusPts = 6;
        let trs = r.pObj.trophies.filter(t => t.type === 'treasure');
        let drags = r.pObj.trophies.filter(t => t.type === 'dragon');
        let eggs = r.pObj.trophies.filter(t => t.type === 'egg' || t.isEgg);

        let cRed = r.pObj.trophies.filter(t => t.color === 'red').length, cGre = r.pObj.trophies.filter(t => t.color === 'green').length;
        let cYel = r.pObj.trophies.filter(t => t.color === 'yellow').length, cPur = r.pObj.trophies.filter(t => t.color === 'purple').length;
        let cWhiteOrig = r.pObj.trophies.filter(t => t.isOriginallyWhite).length; 

        trs.forEach(tr => {
            if (tr.name === "Мушкет") r.trPts += Math.floor(r.teamPower / 4);
            if (tr.name === "Янтарный амулет") r.trPts += cYel;
            if (tr.name === "Желто-красный") r.trPts += Math.min(cYel, cRed) * 2;
            if (tr.name === "Драконья брошь") { let pCnts = {}; drags.forEach(d => { pCnts[d.power] = (pCnts[d.power]||0)+1; }); for (let p in pCnts) r.trPts += Math.floor(pCnts[p]/2)*2; }
            if (tr.name === "Изумрудный") r.trPts += cGre;
            if (tr.name === "Фиолето-желтый") r.trPts += Math.min(cPur, cYel)*2;
            if (tr.name === "Клинок") { let pCnts = {}; r.pObj.powers.forEach(p => { pCnts[p] = (pCnts[p]||0)+1; }); for(let p in pCnts) if(pCnts[p] >= 2) r.trPts += parseInt(p); }
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
                if (contractsWon >= 3) r.trPts += 6; else if (contractsWon === 2) r.trPts += 3;
            }
            if (tr.name === "Скарабей") { 
                let m = 0; if(cRed===0)m++; if(cGre===0)m++; if(cYel===0)m++; if(cPur===0)m++; if(cWhiteOrig===0)m++; 
                r.trPts += m * 3;
            }
            if (tr.name === "Песочные часы") r.trPts += Math.floor(eggs.length / 5) * 6;
        });
        r.total = r.dragPts + r.contPts + r.trPts + r.bonusPts;
    }
    return results;
}

function renderInventories() {
    let currentScores = getLiveScores(); let html = '';
    for (let [id, p] of Object.entries(gameState.players)) {
        let stacks = { red: [], green: [], yellow: [], purple: [], white: [], treasures: [] };
        p.trophies.forEach(t => { if (t.type === 'treasure') stacks.treasures.push(t); if (t.color) stacks[t.color].push(t); });
        let stacksHtml = '';
        ['red', 'green', 'yellow', 'purple', 'white'].forEach(color => {
            if (stacks[color].length === 0) return;
            let cardsHtml = '';
            stacks[color].forEach((item, index) => {
                let isW = (color === 'white' && id === 'blue') ? 'cursor:pointer;' : '';
                let clk = (color === 'white' && id === 'blue') ? `onclick="openColorModal(${index})"` : '';
                if (item.type === 'dragon') cardsHtml += `<div class="card ${color}" style="${isW}" ${clk}><div class="crowns">👑${item.crowns}</div><div class="power">${item.power}</div></div>`;
                else if (item.type === 'egg' || item.isEgg) cardsHtml += `<div class="card ${color} egg-card" style="${isW}" ${clk}><div class="card-title" style="margin-top:30px;">Яйцо</div></div>`;
            });
            stacksHtml += `<div class="stack" title="${color === 'white' && id === 'blue' ? 'Кликни, чтобы перекрасить!' : ''}">${cardsHtml}</div>`;
        });
        let trHtml = ''; stacks.treasures.forEach(tr => { trHtml += `<div class="mini-treasure" title="${tr.desc}">${tr.short}<span>${tr.name}</span></div>`; });
        let capHtml = p.captain ? `<div class="inv-captain" title="${p.captain.desc}">⚓ ${p.captain.name}</div>` : '';
        html += `<div class="inv-panel inv-${id}"><div><b style="font-size:18px;">${p.name}</b> <span style="color:#f1c40f; font-weight:bold; margin-left:15px; font-size:20px;">👑 ${currentScores[id].total}</span><br><span style="color:#bdc3c7; font-size:12px;">Сила: ${p.powers.join(', ')}</span><br>${capHtml}</div><div class="trophies-container">${stacksHtml}<div class="treasure-stack">${trHtml}</div></div></div>`;
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
        if (gameState.players[teamId].trophies.filter(t => t.color === c.color).length >= c.req) {
            c.winner = teamId;
            if (c.treasure) { gameState.players[teamId].trophies.push(c.treasure); c.treasure = null; }
            logMsg(`🏆 ${gameState.players[teamId].name} выполнил контракт "${c.title}"!`, 'log-move');
            changed = true;
        }
    });
    if (changed) { renderContracts(); renderInventories(); }
}

let pendingWhiteIndex = null;
function openColorModal(index) { if (gameState.isActionPaused) return; pendingWhiteIndex = index; document.getElementById('color-modal').style.display = 'block'; }
function applyColor(newColor) {
    let whites = gameState.players.blue.trophies.filter(t => t.color === 'white');
    if (whites[pendingWhiteIndex]) whites[pendingWhiteIndex].color = newColor; 
    document.getElementById('color-modal').style.display = 'none';
    renderInventories(); checkContractsInstant('blue'); 
}
document.getElementById('color-cancel-btn').onclick = function(){ document.getElementById('color-modal').style.display = 'none'; };

function showGenericModal(title, desc, htmlContent) {
    return new Promise(resolve => {
        document.getElementById('gm-title').innerText = title;
        document.getElementById('gm-desc').innerText = desc;
        document.getElementById('gm-content').innerHTML = htmlContent;
        document.getElementById('generic-modal').style.display = 'block';
        window.resolveGeneric = function(val) { document.getElementById('generic-modal').style.display = 'none'; resolve(val); };
        document.getElementById('gm-cancel').onclick = function() { document.getElementById('generic-modal').style.display = 'none'; resolve(null); };
    });
}

// ==== ИСПРАВЛЕНИЕ: ВОЗВРАТ ФУНКЦИЙ УСИЛЕНИЯ ====
let upgradeResolve = null;
function showUpgradeModal(teamId) {
    return new Promise(resolve => {
        upgradeResolve = resolve;
        let availIndices = gameState.players[teamId].avail.map((a, i) => a ? i : -1).filter(i => i !== -1);
        if (availIndices.length === 0) { resolve(); return; } 
        let html = '';
        availIndices.forEach(i => { 
            html += `<div class="hunter-disk team-blue" style="position:relative; cursor:pointer;" onclick="applyUpgrade(${i})">${gameState.players[teamId].powers[i]}</div>`; 
        });
        document.getElementById('upgrade-options').innerHTML = html; 
        document.getElementById('upgrade-modal').style.display = 'block';
    });
}

function applyUpgrade(index) {
    gameState.players.blue.powers[index]++; 
    document.getElementById('upgrade-modal').style.display = 'none';
    renderInventories(); 
    if (upgradeResolve) upgradeResolve();
}

function cancelUpgrade() { 
    document.getElementById('upgrade-modal').style.display = 'none'; 
    if (upgradeResolve) upgradeResolve(); 
}

let swapState = { active: false, resolveFunc: null, selected: [] };
function startSwap(locIndex) {
    return new Promise(resolve => {
        let loc = document.getElementById(`loc-${locIndex}`);
        let dragons = loc.querySelectorAll('.dragon-card');
        if (dragons.length < 2) { resolve(); return; }
        document.getElementById('action-header').style.display = 'block';
        document.getElementById('action-header').innerHTML = `Выберите 2 драконов для обмена или <button onclick="cancelSwap()" style="margin-left:15px; cursor:pointer;">Отказаться</button>`;
        loc.classList.add('swap-mode'); swapState = { active: true, resolveFunc: resolve, selected: [], dragonsList: dragons, locElement: loc };
        dragons.forEach(d => {
            d.onclick = function() {
                if (!swapState.active) return;
                this.classList.toggle('swap-selected');
                if (this.classList.contains('swap-selected')) swapState.selected.push(this); else swapState.selected = swapState.selected.filter(el => el !== this);
                if (swapState.selected.length === 2) {
                    let parent = swapState.selected[0].parentNode;
                    let n1 = swapState.selected[0]; let n2 = swapState.selected[1]; let s1 = n1.nextSibling === n2 ? n1 : n1.nextSibling;
                    n2.parentNode.insertBefore(n1, n2); parent.insertBefore(n2, s1);
                    endSwapUI();
                }
            };
        });
    });
}
function cancelSwap() { if (swapState.active) endSwapUI(); }
function endSwapUI() {
    swapState.active = false; swapState.selected.forEach(el => el.classList.remove('swap-selected'));
    swapState.locElement.classList.remove('swap-mode'); swapState.dragonsList.forEach(d => d.onclick = null);
    document.getElementById('action-header').style.display = 'none'; swapState.resolveFunc();
}

function botRecolorWhite(team) {
    let whites = gameState.players[team].trophies.filter(t => t.color === 'white');
    if (whites.length === 0) return;
    let changed = false;
    whites.forEach(w => {
        let chosenColor = colors[Math.floor(Math.random() * colors.length)]; 
        for (let c of gameState.contracts) {
            if (!c.winner && c.type !== 'majority' && gameState.players[team].trophies.filter(t => t.color === c.color).length + 1 >= c.req) { chosenColor = c.color; break; }
        }
        w.color = chosenColor; changed = true; logMsg(`🤖 ${gameState.players[team].name} перекрасил белую карту в ${chosenColor}!`, "log-move");
    });
    if (changed) { renderInventories(); checkContractsInstant(team); }
}

function startRound() {
    document.getElementById('game-ui').style.display = 'block';
    gameState.disksPlaced = 0;
    firstPlayerIndex = (gameState.round - 1) % turnOrder.length; currentTurnIndex = firstPlayerIndex;
    for (let id in gameState.players) { gameState.players[id].avail = [true, true, true]; gameState.captainsUsedRound[id] = false; }
    document.getElementById('action-header').style.display = 'none';
    renderInventories(); renderBoard();
    let activeTeam = turnOrder[currentTurnIndex];
    document.getElementById('round-info').innerText = activeTeam === 'blue' ? `Раунд ${gameState.round}/5 | Ваш ход` : `Раунд ${gameState.round}/5 | Начинает ${gameState.players[activeTeam].name}...`;
    updateCaptainButton();
    if (gameState.players[activeTeam].isBot) setTimeout(() => botTurn(activeTeam), 1000);
}

function nextTurn() {
    if (gameState.disksPlaced >= gameState.totalDisksRound) {
        document.getElementById('round-info').innerText = "Засада окончена! Начинается прорыв!";
        document.getElementById('resolve-btn').style.display = 'block'; document.getElementById('captain-btn').style.display = 'none'; return;
    }
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length; let activeTeam = turnOrder[currentTurnIndex];
    document.getElementById('round-info').innerText = activeTeam === 'blue' ? `Ваш ход (Выберите диск)` : `${gameState.players[activeTeam].name} делает ход...`;
    updateCaptainButton();
    if (gameState.players[activeTeam].isBot) setTimeout(() => botTurn(activeTeam), 1000);
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

    let html = ''; let currDeck = gameState.round < 4 ? decks.d1 : decks.d2;
    activeBps.forEach((loc, locIndex) => {
        let dragonsHtml = '';
        for (let i=0; i<loc.dragCount; i++) {
            if (currDeck.length === 0) break; let d = currDeck.pop();
            dragonsHtml += `<div class="card dragon-card ${d.color}" data-loc="${locIndex}" data-power="${d.power}" data-basepower="${d.power}" data-color="${d.color}" data-crowns="${d.crowns}"><div class="crowns">👑${d.crowns}</div><div class="power">${d.power}</div></div>`;
        }
        let slotsHtml = '';
        loc.slots.forEach((slot, slotIndex) => {
            let isLoot = slot.b.startsWith('loot'); let inner = isLoot ? '' : `<div style="font-weight:bold; color:#bdc3c7; z-index:2; position:relative;">${slot.t}</div>`;
            let extraData = `data-bonus="${slot.b}"`;
            if (slot.b === 'loot_egg' && decks.eggs.length > 0) {
                let egg = decks.eggs.pop(); inner += `<div class="card ${egg.color} egg-card" style="position:absolute; width:65px; height:90px; z-index:1;"><div class="card-title" style="margin-top:35px;">Яйцо</div></div>`; extraData += ` data-obj='${JSON.stringify(egg)}'`;
            } else if (slot.b === 'loot_tr' && decks.treasures.length > 0) {
                let tr = decks.treasures.pop(); inner += `<div class="card treasure-card" title="${tr.desc}" style="position:absolute; width:65px; height:90px; z-index:1;"><div style="font-size:16px; margin-top:10px;">${tr.short}</div><div class="card-title" style="font-size:8px;">${tr.name}</div></div>`; extraData += ` data-obj='${JSON.stringify(tr)}'`;
            } else if (isLoot) inner = `<div style="color:#7f8c8d; font-size:10px;">Пусто</div>`; 
            slotsHtml += `<div class="slot" id="slot-${locIndex}-${slotIndex}" ${extraData} onclick="placeDisk(this, ${locIndex})">${inner}</div>`;
        });
        html += `<div class="location" id="loc-${locIndex}"><div class="dragons-area">${dragonsHtml}</div><div class="slots-area">${slotsHtml}</div></div>`;
    });
    document.getElementById('game-board').innerHTML = html; renderHand();
}

function renderHand() {
    let html = '';
    gameState.players.blue.powers.forEach((power, index) => {
        if (gameState.players.blue.avail[index]) html += `<div class="hunter-disk team-blue" style="position:relative;" data-index="${index}" data-power="${power}" onclick="selectDisk(this)">${power}</div>`;
    });
    document.getElementById('player-disks').innerHTML = html;
}

function updateCaptainButton() {
    let cap = gameState.players.blue.captain; let btn = document.getElementById('captain-btn');
    if(turnOrder[currentTurnIndex] === 'blue' && cap && cap.phase === 'ambush_active' && !gameState.captainsUsedRound.blue) btn.style.display = 'block'; else btn.style.display = 'none';
}

function useCaptainAbility() {
    let cap = gameState.players.blue.captain.id;
    if(cap === 'bramm') startBramm('blue'); if(cap === 'sylvia') startSylvia('blue'); if(cap === 'quint') startQuint('blue');
}

async function startBramm(team) {
    let drags = gameState.players[team].trophies.filter(t => t.type === 'dragon');
    let avail = gameState.players[team].avail.map((a,i) => a?i:-1).filter(i=>i!==-1);
    if(drags.length === 0 || avail.length === 0) return alert("Нет драконов или свободных дисков!");
    let html = `<h4>1. Выберите дракона для сброса:</h4>`;
    drags.forEach((d, index) => { html += `<div class="card ${d.color}" style="display:inline-block; transform:scale(0.8); cursor:pointer;" onclick="resolveGeneric({step:1, dragIdx:${index}})">👑${d.crowns} <br> 💪${d.power}</div>`; });
    let res1 = await showGenericModal("Брамм 'Мёртвый узел'", "Сбросьте дракона, чтобы получить +Силу", html); if(!res1) return;
    let chosenDrag = drags[res1.dragIdx]; let html2 = `<h4>2. Кого усилить на +${chosenDrag.crowns}?</h4>`;
    avail.forEach(i => { html2 += `<div class="hunter-disk team-${team}" style="position:relative; cursor:pointer;" onclick="resolveGeneric(${i})">${gameState.players[team].powers[i]}</div>`; });
    let res2 = await showGenericModal("Брамм 'Мёртвый узел'", "", html2); if(res2 === null) return;
    gameState.players[team].powers[res2] += chosenDrag.crowns;
    let globalDragIdx = gameState.players[team].trophies.indexOf(chosenDrag); if(globalDragIdx > -1) gameState.players[team].trophies.splice(globalDragIdx, 1);
    gameState.captainsUsedRound[team] = true; renderInventories(); updateCaptainButton(); logMsg(`⚓ Брамм сбросил дракона и усилися на +${chosenDrag.crowns}!`);
}

async function startSylvia(team) {
    let hidden = document.querySelectorAll('.hidden-disk');
    if(hidden.length === 0) return alert("На поле нет скрытых дисков!");
    document.getElementById('action-header').style.display = 'block'; document.getElementById('action-header').innerText = "Сильвия: Кликните на любой серый диск!"; document.body.classList.add('peek-mode');
    return new Promise(resolve => {
        let handler = function(e) {
            if(e.target.classList.contains('hidden-disk')) {
                let disk = e.target; disk.classList.remove('hidden-disk'); disk.classList.add(`team-${disk.dataset.team}`); disk.innerText = disk.dataset.power;
                setTimeout(() => {
                    disk.classList.add('hidden-disk'); disk.classList.remove(`team-${disk.dataset.team}`); disk.innerText = "?"; document.body.classList.remove('peek-mode'); document.getElementById('action-header').style.display = 'none';
                    hidden.forEach(h => h.removeEventListener('click', handler)); gameState.captainsUsedRound[team] = true; updateCaptainButton(); logMsg(`⚓ Сильвия подсмотрела диск!`); resolve();
                }, 2000);
            }
        };
        hidden.forEach(h => h.addEventListener('click', handler));
        document.getElementById('gm-cancel').onclick = function() { document.body.classList.remove('peek-mode'); document.getElementById('action-header').style.display = 'none'; hidden.forEach(h => h.removeEventListener('click', handler)); resolve(); }
    });
}

async function startQuint(team) {
    let avail = gameState.players[team].avail.map((a,i) => a?i:-1).filter(i=>i!==-1); let validDisks = avail.filter(i => gameState.players[team].powers[i] > 1);
    if(validDisks.length === 0) return alert("Нет доступных дисков с силой > 1!");
    let validContracts = gameState.contracts.filter(c => !c.winner && c.type !== 'majority' && gameState.players[team].trophies.filter(t => t.color === c.color).length === c.req - 1);
    if(validContracts.length === 0) return alert("Нет контрактов, где не хватает ровно 1 карты!");
    let html = `<h4>1. Выберите диск, чтобы пожертвовать -1 силы:</h4>`; validDisks.forEach(i => { html += `<div class="hunter-disk team-${team}" style="position:relative; cursor:pointer;" onclick="resolveGeneric(${i})">${gameState.players[team].powers[i]}</div>`; });
    let diskIdx = await showGenericModal("Квинт 'Золотой Змей'", "Пожертвуйте силу ради контракта", html); if(diskIdx === null) return;
    let html2 = `<h4>2. Какой контракт забрать?</h4>`; validContracts.forEach((c, idx) => { html2 += `<button style="padding:10px; margin:5px; border:2px solid ${c.color}; cursor:pointer;" onclick="resolveGeneric(${idx})">${c.title}</button>`; });
    let cIdx = await showGenericModal("Квинт 'Золотой Змей'", "", html2); if(cIdx === null) return;
    gameState.players[team].powers[diskIdx] -= 1; let chosenContract = validContracts[cIdx]; chosenContract.winner = team;
    if(chosenContract.treasure) { gameState.players[team].trophies.push(chosenContract.treasure); chosenContract.treasure = null; }
    gameState.captainsUsedRound[team] = true; renderInventories(); renderContracts(); updateCaptainButton(); logMsg(`⚓ Квинт пожертвовал силой и мгновенно забрал контракт "${chosenContract.title}"!`, "log-move");
}

async function handleCorvo(team, originalSlot, locIndex) {
    let loc = document.getElementById(`loc-${locIndex}`);
    let otherBonusSlots = Array.from(loc.querySelectorAll('.slot')).filter(s => s !== originalSlot && !s.querySelector('.hunter-disk') && s.dataset.bonus);
    if(otherBonusSlots.length === 0) return originalSlot; 
    let html = `<h4>Откуда забрать бонус?</h4><div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">`;
    otherBonusSlots.forEach((s, idx) => {
        let bText = "Награда";
        if(s.hasAttribute('data-obj')) { let obj = JSON.parse(s.dataset.obj); if(obj.type === 'treasure') bText = `💎 ${obj.name}`; if(obj.type === 'egg') bText = `🥚 Яйцо (${obj.color})`; }
        else if(s.dataset.bonus === 'upgrade') bText = "🎩 Усиление"; else if(s.dataset.bonus === 'swap') bText = "🔄 Обмен";
        html += `<button style="padding:10px; cursor:pointer;" onclick="resolveGeneric(${idx})">${bText}</button>`;
    });
    html += `</div>`;
    let chosenIdx = await showGenericModal("Адмирал Корво", "Вы можете перехватить награду с соседней пустой клетки!", html);
    if(chosenIdx !== null) { logMsg(`⚓ Корво перехватил соседнюю награду!`, "log-move"); return otherBonusSlots[chosenIdx]; }
    return originalSlot;
}

let selectedDisk = null;
function selectDisk(element) {
    if (gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue') return;
    document.querySelectorAll('.hunter-disk').forEach(el => el.classList.remove('selected'));
    selectedDisk = element; element.classList.add('selected');
}

async function placeDisk(slotElement, locIndex) {
    if (gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue' || !selectedDisk || slotElement.querySelector('.hunter-disk')) return;
    gameState.isActionPaused = true;
    let dIndex = selectedDisk.dataset.index; gameState.players.blue.avail[dIndex] = false; 
    selectedDisk.classList.remove('selected'); selectedDisk.style.position = 'absolute'; selectedDisk.dataset.team = 'blue';
    slotElement.appendChild(selectedDisk); selectedDisk = null;

    let slotToLoot = slotElement;
    if(gameState.players.blue.captain && gameState.players.blue.captain.id === 'corvo') slotToLoot = await handleCorvo('blue', slotElement, locIndex);
    
    let bonus = slotToLoot.dataset.bonus;
    if (bonus && bonus.startsWith('loot') && slotToLoot.dataset.obj) {
        gameState.players.blue.trophies.push(JSON.parse(slotToLoot.dataset.obj));
        let c = slotToLoot.querySelector('.card'); if (c) c.remove(); slotToLoot.removeAttribute('data-obj');
        renderInventories(); checkContractsInstant('blue'); finalizePlayerTurn();
    } else if (bonus === 'upgrade') {
        showUpgradeModal('blue').then(() => finalizePlayerTurn());
    } else if (bonus === 'swap') {
        startSwap(locIndex).then(() => finalizePlayerTurn());
    } else finalizePlayerTurn();
}

function finalizePlayerTurn() {
    gameState.isActionPaused = false; document.getElementById('action-header').style.display = 'none';
    gameState.disksPlaced++; renderHand(); nextTurn();
}

function botTurn(team) {
    let emptySlots = Array.from(document.querySelectorAll('.slot')).filter(s => !s.querySelector('.hunter-disk'));
    let availIndices = gameState.players[team].avail.map((a, i) => a ? i : -1).filter(i => i !== -1);
    if (emptySlots.length === 0 || availIndices.length === 0) return;

    let cap = gameState.players[team].captain.id; let usedCap = gameState.captainsUsedRound[team];

    if(cap === 'quint' && !usedCap) {
        let validContracts = gameState.contracts.filter(c => !c.winner && c.type !== 'majority' && gameState.players[team].trophies.filter(t => t.color === c.color).length === c.req - 1);
        let strongDisks = availIndices.filter(i => gameState.players[team].powers[i] > 1);
        if(validContracts.length > 0 && strongDisks.length > 0) {
            gameState.players[team].powers[strongDisks[0]] -= 1; validContracts[0].winner = team;
            if(validContracts[0].treasure) { gameState.players[team].trophies.push(validContracts[0].treasure); validContracts[0].treasure = null; }
            gameState.captainsUsedRound[team] = true; logMsg(`🤖 Квинт (${team}) пожертвовал силой и взял контракт!`);
        }
    }

    if(cap === 'bramm' && !usedCap) {
        let weakDragIdx = gameState.players[team].trophies.findIndex(t => t.type === 'dragon' && t.crowns === 1);
        if(weakDragIdx > -1) {
            let drag = gameState.players[team].trophies[weakDragIdx]; gameState.players[team].powers[availIndices[0]] += drag.crowns;
            gameState.players[team].trophies.splice(weakDragIdx, 1); gameState.captainsUsedRound[team] = true; logMsg(`🤖 Брамм (${team}) сбросил дракона ради силы!`);
        }
    }

    let bestMove = null; let maxScore = -1;
    emptySlots.forEach(slot => {
        availIndices.forEach(dIndex => {
            let score = Math.random() * 5; let power = gameState.players[team].powers[dIndex];
            if (slot.hasAttribute('data-obj')) score += 8;
            if (slot.dataset.bonus === 'upgrade' && gameState.players[team].powers.some(p => p < 4)) score += 6;
            let loc = slot.closest('.location'); let dragons = Array.from(loc.querySelectorAll('.dragon-card'));
            dragons.forEach(d => {
                let dPower = parseInt(d.dataset.power);
                if (power >= dPower) { score += 4; gameState.contracts.forEach(c => { if (!c.winner && c.color === d.dataset.color) score += 10; }); } else score += 2; 
            });
            if (score > maxScore) { maxScore = score; bestMove = { slot, dIndex }; }
        });
    });

    gameState.players[team].avail[bestMove.dIndex] = false;
    let diskEl = document.createElement('div'); diskEl.className = `hunter-disk hidden-disk`; diskEl.innerText = "?"; 
    diskEl.dataset.team = team; diskEl.dataset.power = gameState.players[team].powers[bestMove.dIndex]; diskEl.dataset.index = bestMove.dIndex;
    bestMove.slot.appendChild(diskEl);
    
    let slotToLoot = bestMove.slot;
    if(cap === 'corvo') {
        let otherBonus = Array.from(bestMove.slot.closest('.location').querySelectorAll('.slot')).filter(s => s !== bestMove.slot && !s.querySelector('.hunter-disk') && s.hasAttribute('data-obj'));
        if(otherBonus.length > 0) { slotToLoot = otherBonus[0]; logMsg(`🤖 Корво (${team}) перехватил соседний лут!`); }
    }

    let bonus = slotToLoot.dataset.bonus;
    if (bonus && bonus.startsWith('loot') && slotToLoot.dataset.obj) {
        gameState.players[team].trophies.push(JSON.parse(slotToLoot.dataset.obj));
        let c = slotToLoot.querySelector('.card'); if (c) c.remove(); slotToLoot.removeAttribute('data-obj');
        checkContractsInstant(team); botRecolorWhite(team); 
    } else if (bonus === 'upgrade') {
        let avail = gameState.players[team].avail.findIndex(a => a === true); if (avail !== -1) gameState.players[team].powers[avail]++; 
    } else if (bonus === 'swap') {
        let loc = slotToLoot.closest('.location'); let d = Array.from(loc.querySelectorAll('.dragon-card')); if (d.length > 1) loc.querySelector('.dragons-area').insertBefore(d[1], d[0]); 
    }
    renderInventories(); gameState.disksPlaced++; nextTurn();
}

function logMsg(text, type="") {
    const logBox = document.getElementById('battle-log'); logBox.style.display = 'block';
    logBox.innerHTML += `<p class="${type}">${text}</p>`; logBox.scrollTop = logBox.scrollHeight;
}

async function resolvePhaseAsync() {
    document.getElementById('resolve-btn').style.display = 'none'; document.getElementById('captain-btn').style.display = 'none';
    let locations = document.querySelectorAll('.location');
    for (let loc of locations) {
        let dragons = Array.from(loc.querySelectorAll('.dragon-card')).reverse();
        let slots = Array.from(loc.querySelectorAll('.slot'));
        for (let dCard of dragons) {
            let dPower = parseInt(dCard.dataset.power); let isCaught = false; dCard.classList.add('active-dragon'); await delay(800); 
            for (let slot of slots) {
                let disk = slot.querySelector('.hunter-disk');
                if (disk && disk.style.opacity !== '0') {
                    slot.classList.add('active-slot'); await delay(500); 
                    let hTeam = disk.dataset.team; let hIndex = disk.dataset.index; let hPower = parseInt(disk.dataset.power);
                    let cap = gameState.players[hTeam].captain.id; let usedCap = gameState.captainsUsedRound[hTeam];
                    if (disk.classList.contains('hidden-disk')) { disk.className = `hunter-disk team-${hTeam}`; disk.innerText = hPower; await delay(700); }
                    if (cap === 'iris' && !usedCap) {
                        if (hTeam === 'blue') {
                            let use = await showGenericModal("Железная Ирис", "Использовать бонус +2 силы к этому диску?", `<button class="color-btn" style="background:#2ecc71;" onclick="resolveGeneric(true)">Да (+2)</button>`);
                            if(use) { hPower += 2; disk.innerText = hPower; gameState.players[hTeam].powers[hIndex]+=2; gameState.captainsUsedRound[hTeam] = true; logMsg(`⚓ Ирис применяет способность! (+2)`); await delay(500); }
                        } else {
                            if(hPower < dPower && hPower + 2 >= dPower) { hPower += 2; disk.innerText = hPower; gameState.players[hTeam].powers[hIndex]+=2; gameState.captainsUsedRound[hTeam] = true; logMsg(`🤖 Ирис (${hTeam}) внезапно дает +2 силы!`); await delay(500); }
                        }
                    }
                    if (hPower >= dPower) {
                        let basePower = parseInt(dCard.dataset.basepower); let isOrigWhite = dCard.dataset.color === 'white'; let finalColor = dCard.dataset.color;
                        if (cap === 'eleonora' && !usedCap) {
                            if (hTeam === 'blue') {
                                let html = `<div style="display:flex; gap:5px;"><button class="color-btn red" onclick="resolveGeneric('red')">К</button><button class="color-btn green" onclick="resolveGeneric('green')">З</button><button class="color-btn yellow" onclick="resolveGeneric('yellow')">Ж</button><button class="color-btn purple" onclick="resolveGeneric('purple')">Ф</button></div>`;
                                let chosen = await showGenericModal("Мадам Элеонора", "Перекрасить этого дракона?", html);
                                if(chosen) { finalColor = chosen; gameState.captainsUsedRound[hTeam] = true; logMsg(`⚓ Элеонора перекрасила дракона в ${chosen}!`); }
                            } else {
                                for (let c of gameState.contracts) {
                                    if (!c.winner && c.type !== 'majority' && gameState.players[hTeam].trophies.filter(t => t.color === c.color).length + 1 >= c.req) { finalColor = c.color; gameState.captainsUsedRound[hTeam] = true; logMsg(`🤖 Элеонора (${hTeam}) перекрасила дракона в ${finalColor}!`); break; }
                                }
                            }
                        }
                        gameState.players[hTeam].trophies.push({ type: 'dragon', color: finalColor, power: basePower, crowns: parseInt(dCard.dataset.crowns), isOriginallyWhite: isOrigWhite });
                        if(cap === 'hector') { gameState.players[hTeam].powers[hIndex] = Math.min(8, gameState.players[hTeam].powers[hIndex] + 2); logMsg(`⚓ Гектор качает драконьера на +2!`); }
                        renderInventories(); dCard.style.opacity = '0'; disk.style.opacity = '0'; slot.classList.remove('active-slot'); logMsg(`✅ ${gameState.players[hTeam].name} ПОЙМАЛ дракона!`, "log-win");
                        checkContractsInstant(hTeam); if (isOrigWhite && gameState.players[hTeam].isBot && cap !== 'eleonora') botRecolorWhite(hTeam); 
                        isCaught = true; break; 
                    } else {
                        dPower -= hPower; dCard.dataset.power = dPower; dCard.querySelector('.power').innerText = dPower; dCard.classList.add('clash-anim');
                        if(cap === 'thorvald') { gameState.players[hTeam].powers[hIndex] += 2; logMsg(`❌ Прорыв! Торвальд качает драконьера на +2!`, "log-fail");
                        } else if(cap === 'hector') { gameState.players[hTeam].powers[hIndex] = Math.max(1, gameState.players[hTeam].powers[hIndex] - 1); logMsg(`❌ Прорыв! Гектор штрафует драконьера на -1!`, "log-fail");
                        } else { gameState.players[hTeam].powers[hIndex]++; logMsg(`❌ Змей ослаблен до ${dPower}. Охотник получает +1 к силе!`, "log-fail"); }
                        renderInventories(); await delay(700); dCard.classList.remove('clash-anim'); disk.style.opacity = '0'; slot.classList.remove('active-slot');
                    }
                }
            }
            if (!isCaught) { dCard.style.opacity = '0.2'; await delay(200); }
        }
        for (let slot of slots) { let disk = slot.querySelector('.hunter-disk'); if (disk) disk.style.opacity = '0'; }
    }
    document.getElementById('next-round-btn').style.display = 'block';
}

function calculateFinalScores() {
    let scoresDict = getLiveScores(); let results = Object.values(scoresDict);
    results.sort((a,b) => b.total - a.total); let html = '';
    results.forEach(r => { html += `<tr><td style="font-weight:bold; color:var(--team-${r.id});">${r.name}</td><td>${r.teamPower}</td><td>${r.dragPts}</td><td>${r.contPts}</td><td>${r.trPts}</td><td>+${r.bonusPts}</td><td class="total-col">${r.total}</td></tr>`; });
    document.getElementById('score-body').innerHTML = html; document.getElementById('score-modal').style.display = 'block';
}

function nextRound() { if (gameState.round === 5) { calculateFinalScores(); return; } gameState.round++; startRound(); }
