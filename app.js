const colors = ['red', 'green', 'yellow', 'purple'];
const delay = ms => new Promise(res => setTimeout(res, ms));

let gameState = {
    round: 1, maxRounds: 5, disksPlaced: 0,
    players: {
        blue:  { name: 'Вы', isBot: false, powers: [1,2,3], avail: [true,true,true], trophies: [] },
        red:   { name: 'Бот 1', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] },
        green: { name: 'Бот 2', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] }
    },
    contracts: [],
    isActionPaused: false
};

const turnOrder = ['blue', 'red', 'green'];
let firstPlayerIndex = 0; 
let currentTurnIndex = 0;

const treasuresDb = [
    { name: "Мушкет", short: "👑/3💪", desc: "1 корона за каждые 3 силы всех ваших драконьеров" },
    { name: "Янтарный амулет", short: "👑/🟡", desc: "1 корона за каждого желтого дракона" },
    { name: "Желто-красный", short: "2👑/🟡🔴", desc: "2 короны за пару (Желтый+Красный)" },
    { name: "Драконья брошь", short: "2👑/==", desc: "2 очка за пару драконов одинаковой силы" },
    { name: "Изумрудный", short: "👑/🟢", desc: "1 корона за каждого зеленого дракона" },
    { name: "Фиолето-желтый", short: "2👑/🟣🟡", desc: "2 короны за пару (Фиолетовый+Желтый)" },
    { name: "Белое яйцо", short: "🥚/⚪", desc: "Яйцо. Можно перекрасить как белого дракона" },
    { name: "Клинок", short: "💪=👑", desc: "Очки за драконьеров одинаковой силы" },
    { name: "Кубок", short: "👑/🎁", desc: "1 корона за каждое сокровище" },
    { name: "Корона", short: "3👑/📜", desc: "3 короны за каждый выполненный контракт" },
    { name: "Маска", short: "+3 👑", desc: "Дает 3 короны" },
    { name: "Рюкзак", short: "👑/🥚", desc: "1 корона за каждое яйцо" },
    { name: "Аметистовый", short: "👑/🟣", desc: "1 корона за каждого фиолетового дракона" },
    { name: "Скрижаль", short: "3👑/🐉🥚", desc: "3 короны за пару дракон+яйцо одинакового цвета" },
    { name: "Древний фолиант", short: "6👑/5🎁", desc: "6 корон за каждые 5 сокровищ" },
    { name: "Красно-зеленый", short: "2👑/🔴🟢", desc: "2 короны за пару (Красный+Зеленый)" },
    { name: "Зел-Фиолетовый", short: "2👑/🟢🟣", desc: "2 короны за пару (Зеленый+Фиолетовый)" },
    { name: "Драконий череп", short: "2👑/3🐉", desc: "2 короны за любых 3 дракона" },
    { name: "Рубиновый", short: "👑/🔴", desc: "1 корона за каждого красного дракона" },
    { name: "Призма", short: "5👑/🌈", desc: "5 корон за набор из 4 драконов разных цветов" },
    { name: "Глобус", short: "3👑(7💪)", desc: "3 короны за диск силой 7, или 5 за диск 8" },
    { name: "Скарабей", short: "2👑/⚪", desc: "2 короны за каждого белого дракона" },
    { name: "Песочные часы", short: "6👑/5🥚", desc: "6 корон за каждые 5 яиц" }
];

let decks = { d1: [], d2: [], eggs: [], treasures: [] };

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]];
    } return arr;
}

function initDecks() {
    colors.forEach(c => {
        decks.d1.push({type:'dragon', color: c, power: 3, crowns: 1}, {type:'dragon', color: c, power: 3, crowns: 1},
                      {type:'dragon', color: c, power: 4, crowns: 2}, {type:'dragon', color: c, power: 4, crowns: 2},
                      {type:'dragon', color: c, power: 5, crowns: 3}, {type:'dragon', color: c, power: 6, crowns: 4});
    });
    decks.d1.push({type:'dragon', color: 'white', power: 4, crowns: 1}, {type:'dragon', color: 'white', power: 4, crowns: 1}, {type:'dragon', color: 'white', power: 6, crowns: 2});
    shuffle(decks.d1);

    colors.forEach(c => {
        decks.d2.push({type:'dragon', color: c, power: 5, crowns: 3}, {type:'dragon', color: c, power: 6, crowns: 4},
                      {type:'dragon', color: c, power: 8, crowns: 5}, {type:'dragon', color: c, power: 10, crowns: 6});
    });
    decks.d2.push({type:'dragon', color: 'white', power: 6, crowns: 2}, {type:'dragon', color: 'white', power: 6, crowns: 2});
    shuffle(decks.d2);

    colors.forEach(c => { for(let i=0; i<5; i++) decks.eggs.push({type:'egg', color: c}); });
    shuffle(decks.eggs);
    decks.treasures = shuffle([...treasuresDb]);
}

function renderInventories() {
    let html = '';
    for (let [id, p] of Object.entries(gameState.players)) {
        let stacks = { red: [], green: [], yellow: [], purple: [], white: [], treasures: [] };
        p.trophies.forEach(t => { if(t.type === 'treasure') stacks.treasures.push(t); else stacks[t.color].push(t); });

        let stacksHtml = '';
        ['red', 'green', 'yellow', 'purple', 'white'].forEach(color => {
            if(stacks[color].length === 0) return;
            let cardsHtml = '';
            stacks[color].forEach((item, index) => {
                let isW = (color === 'white' && id === 'blue') ? 'cursor:pointer;' : '';
                let clk = (color === 'white' && id === 'blue') ? `onclick="openColorModal(${index})"` : '';
                if (item.type === 'dragon') cardsHtml += `<div class="card ${color}" style="${isW}" ${clk}><div class="crowns">👑${item.crowns}</div><div class="power">${item.power}</div></div>`;
                else if (item.type === 'egg') cardsHtml += `<div class="card ${color} egg-card" style="${isW}" ${clk}><div class="card-title" style="margin-top:30px;">Яйцо</div></div>`;
            });
            stacksHtml += `<div class="stack" title="${color === 'white' && id === 'blue' ? 'Кликни, чтобы перекрасить!' : ''}">${cardsHtml}</div>`;
        });

        let trHtml = '';
        stacks.treasures.forEach(tr => { trHtml += `<div class="mini-treasure" title="${tr.desc}">${tr.short}<span>${tr.name}</span></div>`; });

        html += `<div class="inv-panel inv-${id}"><div><b style="font-size:18px;">${p.name}</b><br><span style="color:#bdc3c7; font-size:12px;">Сила: ${p.powers.join(', ')}</span></div><div class="trophies-container">${stacksHtml}<div class="treasure-stack">${trHtml}</div></div></div>`;
    }
    document.getElementById('inventories-board').innerHTML = html;
}

function generateContracts() {
    let cColors = shuffle([...colors]); 
    gameState.contracts = [
        { title: "Поймать 3", req: 3, points: 4, color: cColors[0], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Поймать 4", req: 4, points: 6, color: cColors[1], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Поймать 5", req: 5, points: 9, color: cColors[2], type: "regular", treasure: decks.treasures.pop(), winner: null },
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

function checkContracts() {
    let changed = false;
    gameState.contracts.forEach(c => {
        if (c.winner || c.type === 'majority') return; 
        for(let i=0; i<3; i++) {
            let teamId = turnOrder[(firstPlayerIndex + i) % 3];
            let count = gameState.players[teamId].trophies.filter(t => t.type === 'dragon' && t.color === c.color).length;
            if (count >= c.req) {
                c.winner = teamId;
                if (c.treasure) {
                    gameState.players[teamId].trophies.push({type:'treasure', name: c.treasure.name, desc: c.treasure.desc, short: c.treasure.short});
                    c.treasure = null;
                }
                logMsg(`🏆 ${gameState.players[teamId].name} выполнил контракт "${c.title}"!`, 'log-move');
                changed = true; break; 
            }
        }
    });
    if(changed) { renderContracts(); renderInventories(); }
}

let pendingWhiteIndex = null;
function openColorModal(index) {
    if(gameState.isActionPaused) return;
    pendingWhiteIndex = index;
    document.getElementById('color-modal').style.display = 'block';
}
function applyColor(newColor) {
    let whites = gameState.players.blue.trophies.filter(t => t.color === 'white');
    if (whites[pendingWhiteIndex]) whites[pendingWhiteIndex].color = newColor; 
    document.getElementById('color-modal').style.display = 'none';
    renderInventories(); checkContracts(); 
}

function startRound() {
    gameState.disksPlaced = 0;
    firstPlayerIndex = (gameState.round - 1) % 3; 
    currentTurnIndex = firstPlayerIndex;
    
    for (let id in gameState.players) gameState.players[id].avail = [true, true, true];
    document.getElementById('action-header').style.display = 'none';
    
    renderInventories(); renderBoard();
    
    let activeTeam = turnOrder[currentTurnIndex];
    document.getElementById('round-info').innerText = activeTeam === 'blue' ? `Раунд ${gameState.round}/5 | Ваш ход (Вы первый!)` : `Раунд ${gameState.round}/5 | Начинает ${gameState.players[activeTeam].name}...`;
    
    if(gameState.players[activeTeam].isBot) {
        setTimeout(() => botTurn(activeTeam), 1200);
    }
}

function nextTurn() {
    if (gameState.disksPlaced >= 9) {
        document.getElementById('round-info').innerText = "Засада окончена! Начинается прорыв!";
        document.getElementById('resolve-btn').style.display = 'block';
        return;
    }
    currentTurnIndex = (currentTurnIndex + 1) % 3;
    let activeTeam = turnOrder[currentTurnIndex];
    document.getElementById('round-info').innerText = activeTeam === 'blue' ? `Ваш ход (Выберите диск)` : `${gameState.players[activeTeam].name} делает ход...`;
    
    if (gameState.players[activeTeam].isBot) setTimeout(() => botTurn(activeTeam), 1200);
}

function renderBoard() {
    const bps = [
        { dragCount: 2, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усил.", b: 'upgrade'}, {t: "🥚 Яйцо", b: 'loot_egg'}, {t: "💎 Сокр.", b: 'loot_tr'}] },
        { dragCount: 2, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усил.", b: 'upgrade'}, {t: "🥚 Яйцо", b: 'loot_egg'}, {t: "💎 Сокр.", b: 'loot_tr'}] },
        { dragCount: 3, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усил.", b: 'upgrade'}, {t: "🥚 Яйцо", b: 'loot_egg'}, {t: "🥚 Яйцо", b: 'loot_egg'}, {t: "💎 Сокр.", b: 'loot_tr'}] }
    ];

    let html = '';
    let currDeck = gameState.round < 4 ? decks.d1 : decks.d2;

    bps.forEach((loc, locIndex) => {
        let dragonsHtml = '';
        for(let i=0; i<loc.dragCount; i++) {
            if(currDeck.length === 0) break;
            let d = currDeck.pop();
            dragonsHtml += `<div class="card dragon-card ${d.color}" data-loc="${locIndex}" data-power="${d.power}" data-color="${d.color}" data-crowns="${d.crowns}"><div class="crowns">👑${d.crowns}</div><div class="power">${d.power}</div></div>`;
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
                extraData += ` data-obj='${JSON.stringify({type:'treasure', name: tr.name, desc: tr.desc, short: tr.short})}'`;
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
function selectDisk(element) {
    if(gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue') return;
    document.querySelectorAll('.hunter-disk').forEach(el => el.classList.remove('selected'));
    selectedDisk = element; element.classList.add('selected');
}

async function placeDisk(slotElement, locIndex) {
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
        let item = JSON.parse(slotElement.dataset.obj);
        gameState.players.blue.trophies.push(item);
        let c = slotElement.querySelector('.card'); if(c) c.remove();
        renderInventories();
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
}

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
        if (availIndices.length === 0) { resolve(); return; } 
        
        let html = '';
        availIndices.forEach(i => { html += `<div class="hunter-disk team-blue" style="position:relative;" onclick="applyUpgrade(${i})">${gameState.players[teamId].powers[i]}</div>`; });
        document.getElementById('upgrade-options').innerHTML = html;
        document.getElementById('upgrade-modal').style.display = 'block';
    });
}
window.applyUpgrade = function(index) {
    gameState.players.blue.powers[index]++;
    document.getElementById('upgrade-modal').style.display = 'none';
    renderInventories(); upgradeResolve();
}
window.cancelUpgrade = function() {
    document.getElementById('upgrade-modal').style.display = 'none';
    upgradeResolve();
}

let swapState = { active: false, resolveFunc: null, selected: [] };
function startSwap(locIndex) {
    return new Promise(resolve => {
        let loc = document.getElementById(`loc-${locIndex}`);
        let dragons = loc.querySelectorAll('.dragon-card');
        if (dragons.length < 2) { resolve(); return; }
        
        let header = document.getElementById('action-header');
        header.style.display = 'block';
        header.innerHTML = `Нажмите на 2 драконов для обмена или <button onclick="cancelSwap()" style="margin-left:15px; cursor:pointer;">Отказаться</button>`;
        
        loc.classList.add('swap-mode');
        swapState = { active: true, resolveFunc: resolve, selected: [], dragonsList: dragons, locElement: loc };
        
        dragons.forEach(d => {
            d.onclick = function() {
                if(!swapState.active) return;
                this.classList.toggle('swap-selected');
                if (this.classList.contains('swap-selected')) swapState.selected.push(this);
                else swapState.selected = swapState.selected.filter(el => el !== this);
                
                if (swapState.selected.length === 2) {
                    let parent = swapState.selected[0].parentNode;
                    let n1 = swapState.selected[0], n2 = swapState.selected[1];
                    let s1 = n1.nextSibling === n2 ? n1 : n1.nextSibling;
                    n2.parentNode.insertBefore(n1, n2); parent.insertBefore(n2, s1);
                    endSwapUI();
                }
            };
        });
    });
}
window.cancelSwap = function() { if(swapState.active) endSwapUI(); }
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
    if (emptySlots.length === 0) return;

    let slot = emptySlots.find(s => s.hasAttribute('data-obj')) || emptySlots[Math.floor(Math.random() * emptySlots.length)];
    let dIndex = gameState.players[team].avail.findIndex(a => a === true);
    if (dIndex === -1) return; 
    
    gameState.players[team].avail[dIndex] = false;
    
    let diskEl = document.createElement('div');
    diskEl.className = `hunter-disk hidden-disk`; diskEl.innerText = "?"; 
    diskEl.dataset.team = team; diskEl.dataset.power = gameState.players[team].powers[dIndex]; diskEl.dataset.index = dIndex;
    slot.appendChild(diskEl);
    
    let bonus = slot.dataset.bonus;
    if (bonus && bonus.startsWith('loot') && slot.dataset.obj) {
        gameState.players[team].trophies.push(JSON.parse(slot.dataset.obj));
        let c = slot.querySelector('.card'); if(c) c.remove();
    } else if (bonus === 'upgrade') {
        let avail = gameState.players[team].avail.findIndex(a => a === true);
        if(avail !== -1) gameState.players[team].powers[avail]++; 
    } else if (bonus === 'swap') {
        let loc = slot.closest('.location'); let d = Array.from(loc.querySelectorAll('.dragon-card'));
        if(d.length > 1) loc.querySelector('.dragons-area').insertBefore(d[1], d[0]); 
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

async function resolvePhaseAsync() {
    document.getElementById('resolve-btn').style.display = 'none';
    let locations = document.querySelectorAll('.location');
    
    for (let loc of locations) {
        let dragons = Array.from(loc.querySelectorAll('.dragon-card')).reverse();
        let slots = Array.from(loc.querySelectorAll('.slot'));

        for (let dCard of dragons) {
            let dPower = parseInt(dCard.dataset.power);
            let isCaught = false;
            
            dCard.classList.add('active-dragon'); 
            await delay(1000); 

            for (let slot of slots) {
                let disk = slot.querySelector('.hunter-disk');
                if (disk && disk.style.opacity !== '0') {
                    slot.classList.add('active-slot'); 
                    await delay(600); 
                    
                    let hTeam = disk.dataset.team, hIndex = disk.dataset.index, hPower = parseInt(disk.dataset.power);
                    
                    if (disk.classList.contains('hidden-disk')) {
                        disk.className = `hunter-disk team-${hTeam}`; disk.innerText = hPower; 
                        await delay(800); 
                    }

                    if (hPower >= dPower) {
                        gameState.players[hTeam].trophies.push({type: 'dragon', color: dCard.dataset.color, power: dPower, crowns: dCard.dataset.crowns});
                        renderInventories(); dCard.style.opacity = '0'; disk.style.opacity = '0'; slot.classList.remove('active-slot');
                        logMsg(`✅ ${gameState.players[hTeam].name} ПОЙМАЛ дракона!`, "log-win");
                        isCaught = true; break; 
                    } else {
                        dPower -= hPower; dCard.dataset.power = dPower;
                        dCard.querySelector('.power').innerText = dPower; dCard.classList.add('clash-anim');
                        gameState.players[hTeam].powers[hIndex]++; renderInventories(); 
                        logMsg(`❌ Змей ослаблен до ${dPower}. Охотник получает +1 к силе!`, "log-fail");
                        await delay(800); 
                        dCard.classList.remove('clash-anim');
                        disk.style.opacity = '0'; slot.classList.remove('active-slot');
                    }
                }
            }
            if (!isCaught) {
                dCard.style.opacity = '0.2'; 
                await delay(300); 
            }
        }
        for (let slot of slots) { let disk = slot.querySelector('.hunter-disk'); if (disk) disk.style.opacity = '0'; }
    }
    
    checkContracts();
    document.getElementById('next-round-btn').style.display = 'block';
}

function nextRound() {
    if(gameState.round === 5) { alert("Игра окончена! (Подсчет очков в разработке)"); return; }
    gameState.round++; startRound();
}

initDecks(); generateContracts(); startRound();
