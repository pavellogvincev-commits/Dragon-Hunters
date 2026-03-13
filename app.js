const colors = ['red', 'green', 'yellow', 'purple'];
const delay = ms => new Promise(res => setTimeout(res, ms));

let gameState = {
    round: 1, maxRounds: 5, disksPlaced: 0,
    players: {
        blue:  { name: 'Вы', isBot: false, powers: [1,2,3], avail: [true,true,true], trophies: [] },
        red:   { name: 'Бот 1', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] },
        green: { name: 'Бот 2', isBot: true, powers: [1,2,3], avail: [true,true,true], trophies: [] }
    },
    isActionPaused: false // Блокировка хода для выполнения спец-действий
};

// БАЗА ДАННЫХ СОКРОВИЩ (С описаниями)
const treasuresDb = [
    { name: "Мушкет", desc: "1 корона за каждые 3 силы всех ваших драконьеров" },
    { name: "Янтарный амулет", desc: "1 корона за каждого желтого дракона" },
    { name: "Желто-красный кристалл", desc: "2 короны за пару (Желтый + Красный дракон)" },
    { name: "Драконья брошь", desc: "2 очка за пару драконов одинаковой силы" },
    { name: "Изумрудный амулет", desc: "1 корона за каждого зеленого дракона" },
    { name: "Фиолето-желтый кристалл", desc: "2 короны за пару (Фиолетовый + Желтый)" },
    { name: "Клинок", desc: "Очки за драконьеров одинаковой силы (напр. 2 по 8 = 8 очков)" },
    { name: "Кубок", desc: "1 корона за каждое сокровище" },
    { name: "Корона", desc: "3 короны за каждый выполненный вами контракт" },
    { name: "Маска", desc: "Дает 3 короны" },
    { name: "Рюкзак", desc: "1 корона за каждое яйцо" },
    { name: "Белое яйцо", desc: "Считается яйцом. Можно перекрасить как белого дракона" }
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

    colors.forEach(c => { for(let i=0; i<5; i++) decks.eggs.push({type:'egg', color: c}); });
    shuffle(decks.eggs);
    
    decks.treasures = shuffle([...treasuresDb]);
}

// --- ОТРИСОВКА ИНВЕНТАРЯ (СТОПКИ) ---
function renderInventories() {
    let html = '';
    for (let [id, p] of Object.entries(gameState.players)) {
        
        // Сортируем трофеи по стопкам
        let stacks = { red: [], green: [], yellow: [], purple: [], white: [], treasures: [] };
        p.trophies.forEach(t => {
            if(t.type === 'treasure') stacks.treasures.push(t);
            else stacks[t.color].push(t);
        });

        let stacksHtml = '';
        ['red', 'green', 'yellow', 'purple', 'white'].forEach(color => {
            if(stacks[color].length === 0) return;
            
            let cardsHtml = '';
            stacks[color].forEach((item, index) => {
                let isWhitePlayer = (color === 'white' && id === 'blue') ? 'cursor:pointer;' : '';
                let onclick = (color === 'white' && id === 'blue') ? `onclick="openColorModal(${index})"` : '';
                
                if (item.type === 'dragon') {
                    cardsHtml += `<div class="card ${color}" style="${isWhitePlayer}" ${onclick}><div class="crowns">👑${item.crowns}</div><div class="power">${item.power}</div></div>`;
                } else if (item.type === 'egg') {
                    cardsHtml += `<div class="card ${color} egg-card" style="${isWhitePlayer}" ${onclick}><div class="card-title" style="margin-top:35px;">Яйцо</div></div>`;
                }
            });
            stacksHtml += `<div class="stack" title="${color === 'white' && id === 'blue' ? 'Кликни, чтобы перекрасить!' : ''}">${cardsHtml}</div>`;
        });

        let treasuresHtml = '';
        stacks.treasures.forEach(tr => {
            treasuresHtml += `<div class="mini-treasure" title="${tr.desc}">${tr.name}</div>`;
        });

        html += `
        <div class="inv-panel inv-${id}">
            <b style="font-size:18px;">${p.name}</b> <span style="color:#bdc3c7; font-size:12px;">(Сила команды: ${p.powers.join(', ')})</span>
            <div class="trophies-container">
                ${stacksHtml}
                <div class="treasure-stack">${treasuresHtml}</div>
            </div>
        </div>`;
    }
    document.getElementById('inventories-board').innerHTML = html;
}

// --- БЕЛЫЕ ДРАКОНЫ (ПЕРЕКРАСКА) ---
let pendingWhiteIndex = null;
function openColorModal(index) {
    if(gameState.isActionPaused) return; // Нельзя во время хода
    pendingWhiteIndex = index;
    document.getElementById('color-modal').style.display = 'block';
}

function applyColor(newColor) {
    let whites = gameState.players.blue.trophies.filter(t => t.color === 'white');
    if (whites[pendingWhiteIndex]) {
        whites[pendingWhiteIndex].color = newColor; // Перекрасили!
    }
    document.getElementById('color-modal').style.display = 'none';
    renderInventories();
}

function startRound() {
    gameState.disksPlaced = 0;
    for (let id in gameState.players) gameState.players[id].avail = [true, true, true];
    document.getElementById('round-info').innerText = `Раунд ${gameState.round}/5 | Ваш ход`;
    renderInventories(); renderBoard();
}

function renderBoard() {
    const bps = [
        { dragCount: 2, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усиление", b: 'upgrade'}, {t: "💎 Сокровище", b: 'loot'}] },
        { dragCount: 2, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🎩 Усиление", b: 'upgrade'}, {t: "🥚 Яйцо", b: 'loot'}] },
        { dragCount: 3, slots: [{t: "🔄 Обмен", b: 'swap'}, {t: "🥚 Яйцо", b: 'loot'}, {t: "💎 Сокровище", b: 'loot'}] }
    ];

    let html = '';
    bps.forEach((loc, locIndex) => {
        let dragonsHtml = '';
        for(let i=0; i<loc.dragCount; i++) {
            let d = decks.d1.pop();
            dragonsHtml += `<div class="card dragon-card ${d.color}" data-loc="${locIndex}" data-power="${d.power}" data-color="${d.color}" data-crowns="${d.crowns}"><div class="crowns">👑${d.crowns}</div><div class="power">${d.power}</div></div>`;
        }

        let slotsHtml = '';
        loc.slots.forEach((slot, slotIndex) => {
            let inner = `<div style="font-weight:bold; color:#bdc3c7;">${slot.t}</div>`;
            let extraData = `data-bonus="${slot.b}"`;
            
            if (slot.b === 'loot') {
                if (slot.t.includes("Яйцо")) {
                    let egg = decks.eggs.pop();
                    inner += `<div class="card ${egg.color} egg-card" style="position:absolute; width:60px; height:80px;"><div class="card-title" style="margin-top:30px;">Яйцо</div></div>`;
                    extraData += ` data-obj='${JSON.stringify(egg)}'`;
                } else {
                    let tr = decks.treasures.pop();
                    inner += `<div class="card treasure" style="position:absolute; width:60px; height:80px;"><div class="card-title" style="margin-top:20px;">${tr.name}</div></div>`;
                    extraData += ` data-obj='${JSON.stringify({type:'treasure', name: tr.name, desc: tr.desc})}'`;
                }
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

// --- МЕХАНИКИ: ХОДЫ И БОНУСЫ ---
let selectedDisk = null;

function selectDisk(element) {
    if(gameState.isActionPaused) return;
    document.querySelectorAll('.hunter-disk').forEach(el => el.classList.remove('selected'));
    selectedDisk = element; element.classList.add('selected');
}

async function placeDisk(slotElement, locIndex) {
    if (gameState.isActionPaused || !selectedDisk || slotElement.querySelector('.hunter-disk')) return;

    let dIndex = selectedDisk.dataset.index;
    gameState.players.blue.avail[dIndex] = false; 
    
    selectedDisk.classList.remove('selected');
    selectedDisk.style.position = 'absolute';
    selectedDisk.dataset.team = 'blue';
    slotElement.appendChild(selectedDisk);
    selectedDisk = null;
    
    // Проверка бонусов
    let bonus = slotElement.dataset.bonus;
    if (bonus === 'loot') {
        let item = JSON.parse(slotElement.dataset.obj);
        gameState.players.blue.trophies.push(item);
        slotElement.querySelector('.card').remove(); // удаляем визуал лута
        renderInventories();
        finalizePlayerTurn();
    } else if (bonus === 'upgrade') {
        gameState.isActionPaused = true;
        showUpgradeModal('blue').then(() => finalizePlayerTurn());
    } else if (bonus === 'swap') {
        gameState.isActionPaused = true;
        startSwap(locIndex).then(() => finalizePlayerTurn());
    }
}

function finalizePlayerTurn() {
    gameState.isActionPaused = false;
    gameState.disksPlaced++;
    renderHand();
    document.getElementById('round-info').innerText = "Боты делают ход...";
    setTimeout(() => { botTurn('red'); setTimeout(() => { botTurn('green'); checkPhaseEnd(); }, 500); }, 500);
}

// --- БОНУС: УСИЛЕНИЕ (ТРЕУГОЛКА) ---
function showUpgradeModal(teamId) {
    return new Promise(resolve => {
        let availIndices = gameState.players[teamId].avail.map((a, i) => a ? i : -1).filter(i => i !== -1);
        if (availIndices.length === 0) { resolve(); return; } // Нет дисков в руке
        
        let html = '';
        availIndices.forEach(i => {
            html += `<div class="hunter-disk team-blue" style="position:relative;" onclick="applyUpgrade(${i})">${gameState.players[teamId].powers[i]}</div>`;
        });
        document.getElementById('upgrade-options').innerHTML = html;
        document.getElementById('upgrade-modal').style.display = 'block';
        
        window.applyUpgrade = function(index) {
            gameState.players.blue.powers[index]++;
            document.getElementById('upgrade-modal').style.display = 'none';
            renderInventories();
            resolve();
        }
    });
}

// --- БОНУС: ОБМЕН (СМЕНА ДРАКОНОВ) ---
let swapState = { active: false, locIndex: null, selectedDragons: [], resolveFunc: null };

function startSwap(locIndex) {
    return new Promise(resolve => {
        let loc = document.getElementById(`loc-${locIndex}`);
        let dragons = loc.querySelectorAll('.dragon-card');
        if (dragons.length < 2) { resolve(); return; } // Некого менять
        
        document.getElementById('round-info').innerText = "Кликните на 2 драконов, чтобы поменять их местами!";
        loc.classList.add('swap-mode');
        swapState = { active: true, locIndex, selectedDragons: [], resolveFunc: resolve };
        
        dragons.forEach(d => {
            d.onclick = function() {
                if(!swapState.active) return;
                this.classList.toggle('swap-selected');
                if (this.classList.contains('swap-selected')) swapState.selectedDragons.push(this);
                else swapState.selectedDragons = swapState.selectedDragons.filter(el => el !== this);
                
                if (swapState.selectedDragons.length === 2) {
                    // Выполняем физический обмен DOM-элементов
                    let parent = swapState.selectedDragons[0].parentNode;
                    let node1 = swapState.selectedDragons[0];
                    let node2 = swapState.selectedDragons[1];
                    
                    let sibling1 = node1.nextSibling === node2 ? node1 : node1.nextSibling;
                    node2.parentNode.insertBefore(node1, node2);
                    parent.insertBefore(node2, sibling1);
                    
                    node1.classList.remove('swap-selected'); node2.classList.remove('swap-selected');
                    loc.classList.remove('swap-mode');
                    dragons.forEach(d => d.onclick = null); // снимаем листенеры
                    swapState.active = false;
                    resolve();
                }
            };
        });
    });
}

// --- ИИ БОТОВ (ОБНОВЛЕНО) ---
function botTurn(team) {
    let emptySlots = Array.from(document.querySelectorAll('.slot')).filter(s => !s.querySelector('.hunter-disk'));
    if (emptySlots.length === 0) return;

    let slot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
    let dIndex = gameState.players[team].avail.findIndex(a => a === true);
    if (dIndex === -1) return; 
    
    gameState.players[team].avail[dIndex] = false;
    
    let diskEl = document.createElement('div');
    diskEl.className = `hunter-disk hidden-disk`; diskEl.innerText = "?"; 
    diskEl.dataset.team = team; diskEl.dataset.power = gameState.players[team].powers[dIndex]; diskEl.dataset.index = dIndex;
    slot.appendChild(diskEl);
    
    // Боты тоже получают бонусы!
    let bonus = slot.dataset.bonus;
    if (bonus === 'loot') {
        gameState.players[team].trophies.push(JSON.parse(slot.dataset.obj));
        slot.querySelector('.card').remove();
    } else if (bonus === 'upgrade') {
        let avail = gameState.players[team].avail.findIndex(a => a === true);
        if(avail !== -1) gameState.players[team].powers[avail]++; // Качает первого доступного
    } else if (bonus === 'swap') {
        // Бот просто случайно меняет драконов для хаоса
        let loc = slot.closest('.location');
        let d = Array.from(loc.querySelectorAll('.dragon-card'));
        if(d.length > 1) loc.querySelector('.dragons-area').insertBefore(d[1], d[0]); 
    }
    
    renderInventories();
    gameState.disksPlaced++;
}

function checkPhaseEnd() {
    if (gameState.disksPlaced >= 9) {
        document.getElementById('round-info').innerText = "Засада окончена! Начинается прорыв!";
        document.getElementById('resolve-btn').style.display = 'block';
    } else {
        document.getElementById('round-info').innerText = `Раунд ${gameState.round}/5 | Ваш ход`;
    }
}

// --- ФАЗА ПРОРЫВА (УПРОЩЕННЫЙ ВИД) ---
async function resolvePhaseAsync() {
    document.getElementById('resolve-btn').style.display = 'none';
    let locations = document.querySelectorAll('.location');
    
    for (let loc of locations) {
        let dragons = Array.from(loc.querySelectorAll('.dragon-card')).reverse();
        let slots = Array.from(loc.querySelectorAll('.slot'));

        for (let dCard of dragons) {
            let dPower = parseInt(dCard.dataset.power);
            let isCaught = false;
            dCard.classList.add('active-dragon'); await delay(600);

            for (let slot of slots) {
                let disk = slot.querySelector('.hunter-disk');
                if (disk && disk.style.opacity !== '0') {
                    slot.classList.add('active-slot'); await delay(300);
                    
                    let hTeam = disk.dataset.team; let hIndex = disk.dataset.index;
                    let hPower = parseInt(disk.dataset.power);
                    
                    if (disk.classList.contains('hidden-disk')) {
                        disk.className = `hunter-disk team-${hTeam}`; disk.innerText = hPower; await delay(500);
                    }

                    if (hPower >= dPower) {
                        gameState.players[hTeam].trophies.push({type: 'dragon', color: dCard.dataset.color, power: dPower, crowns: dCard.dataset.crowns});
                        renderInventories();
                        dCard.style.opacity = '0'; disk.style.opacity = '0'; slot.classList.remove('active-slot');
                        isCaught = true; break; 
                    } else {
                        dPower -= hPower; dCard.dataset.power = dPower;
                        dCard.querySelector('.power').innerText = dPower; dCard.classList.add('clash-anim');
                        gameState.players[hTeam].powers[hIndex]++; renderInventories(); // +1 ОПЫТ
                        await delay(400); dCard.classList.remove('clash-anim');
                        disk.style.opacity = '0'; slot.classList.remove('active-slot');
                    }
                }
            }
            if (!isCaught) dCard.style.opacity = '0.2'; await delay(200); 
        }
        for (let slot of slots) { let disk = slot.querySelector('.hunter-disk'); if (disk) disk.style.opacity = '0'; }
    }
    document.getElementById('next-round-btn').style.display = 'block';
}

function nextRound() {
    gameState.round++;
    startRound();
}

initDecks();
startRound();
