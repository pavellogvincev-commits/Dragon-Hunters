// --- БАЗОВЫЕ НАСТРОЙКИ И ДАННЫЕ ---
const colors = ['red', 'green', 'yellow', 'purple'];
const delay = ms => new Promise(res => setTimeout(res, ms));

// Состояние игры
let gameState = {
    round: 1,
    maxRounds: 5,
    disksPlaced: 0,
    players: {
        blue:  { name: 'Вы', isBot: false, powers: [1,2,3], avail: [true,true,true], dragons: [], eggs: [], treasures: [] },
        red:   { name: 'Бот 1', isBot: true, powers: [1,2,3], avail: [true,true,true], dragons: [], eggs: [], treasures: [] },
        green: { name: 'Бот 2', isBot: true, powers: [1,2,3], avail: [true,true,true], dragons: [], eggs: [], treasures: [] }
    },
    contracts: []
};

let decks = { d1: [], d2: [], eggs: [], treasures: [] };

// --- ГЕНЕРАЦИЯ КОЛОД ---
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function initDecks() {
    // Драконы I уровня (27 шт)
    colors.forEach(c => {
        decks.d1.push({color: c, power: 3, crowns: 1}, {color: c, power: 3, crowns: 1});
        decks.d1.push({color: c, power: 4, crowns: 2}, {color: c, power: 4, crowns: 2});
        decks.d1.push({color: c, power: 5, crowns: 3}, {color: c, power: 6, crowns: 4});
    });
    decks.d1.push({color: 'white', power: 4, crowns: 1}, {color: 'white', power: 4, crowns: 1}, {color: 'white', power: 6, crowns: 2});
    shuffle(decks.d1);

    // Драконы II уровня (18 шт)
    colors.forEach(c => {
        decks.d2.push({color: c, power: 5, crowns: 3}, {color: c, power: 6, crowns: 4});
        decks.d2.push({color: c, power: 8, crowns: 5}, {color: c, power: 10, crowns: 6});
    });
    decks.d2.push({color: 'white', power: 6, crowns: 2}, {color: 'white', power: 6, crowns: 2});
    shuffle(decks.d2);

    // Яйца (20 шт)
    colors.forEach(c => { for(let i=0; i<5; i++) decks.eggs.push(c); });
    shuffle(decks.eggs);

    // Сокровища (23 шт) - пока просто названия
    decks.treasures = shuffle(["Мушкет", "Янтарный амулет", "Кристалл", "Брошь", "Изумрудный амулет", "Яйцо", "Клинок", "Кубок", "Корона", "Маска", "Рюкзак"]); 
}

// --- ОТРИСОВКА ИНТЕРФЕЙСА ---
function renderInventories() {
    let html = '';
    for (let [id, p] of Object.entries(gameState.players)) {
        html += `
        <div class="inv-panel inv-${id}">
            <b>${p.name} (Сила: ${p.powers.join(', ')})</b>
            <div class="inv-stats">
                <span>🐉 Драконы: ${p.dragons.length}</span>
                <span>🥚 Яйца: ${p.eggs.length}</span>
                <span>💎 Сокровища: ${p.treasures.length}</span>
            </div>
        </div>`;
    }
    document.getElementById('inventories-board').innerHTML = html;
}

function generateContracts() {
    let contractColors = shuffle([...colors]); 
    gameState.contracts = [
        { title: "Поймать 3", req: 3, color: contractColors[0], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Поймать 4", req: 4, color: contractColors[1], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Поймать 5", req: 5, color: contractColors[2], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Больше всех", req: 0, color: contractColors[3], type: "majority", treasure: null, winner: null }
    ];
    renderContracts();
}

function renderContracts() {
    let html = '';
    gameState.contracts.forEach(c => {
        let status = c.winner ? `<div style="color:#2ecc71; font-weight:bold; margin-top:5px;">Выполнил: ${gameState.players[c.winner].name}</div>` : '';
        html += `
            <div class="contract ${c.winner ? 'completed' : ''}">
                <div>${c.title}</div>
                <div class="req ${c.color}">Цвет племени</div>
                ${c.treasure && !c.winner ? `<div class="treasure-attach">🎁 ${c.treasure}</div>` : ''}
                ${status}
            </div>
        `;
    });
    document.getElementById('contracts-board').innerHTML = html;
}

function startRound() {
    gameState.disksPlaced = 0;
    for (let id in gameState.players) {
        gameState.players[id].avail = [true, true, true];
    }
    
    document.getElementById('round-info').innerText = `Раунд ${gameState.round}/5 | Ваш ход`;
    document.getElementById('resolve-btn').style.display = 'none';
    document.getElementById('next-round-btn').style.display = 'none';
    
    renderInventories();
    renderBoard();
}

function renderBoard() {
    const boardBlueprints = [
        { dragCount: 2, slots: ["🔄 Поменять", "🎩 Усилить", "💎 Сокровище"] },
        { dragCount: 2, slots: ["🔄 Поменять", "🎩 Усилить", "🥚 Яйцо", "💎 Сокровище"] },
        { dragCount: 3, slots: ["🔄 Поменять", "🎩 Усилить", "🥚 Яйцо", "🥚 Яйцо", "💎 Сокровище"] }
    ];

    let html = '';
    let currentDeck = gameState.round < 4 ? decks.d1 : decks.d2;

    boardBlueprints.forEach((loc, locIndex) => {
        let dragonsHtml = '';
        for(let i=0; i<loc.dragCount; i++) {
            if(currentDeck.length === 0) break;
            let d = currentDeck.pop();
            dragonsHtml += `<div class="card dragon-card ${d.color}" data-power="${d.power}" data-color="${d.color}"><div class="crowns">👑${d.crowns}</div><div class="power">${d.power}</div><div class="card-title">Дракон</div></div>`;
        }

        let slotsHtml = '';
        loc.slots.forEach((slotType, slotIndex) => {
            let inner = `<div class="slot-title">${slotType.split(" ")[0]}</div>`;
            let lootData = "";
            
            if (slotType.includes("Яйцо") && decks.eggs.length > 0) {
                let color = decks.eggs.pop();
                inner += `<div class="card ${color} egg-card" style="position:absolute; width:60px; height:80px; z-index:1;"><div class="card-title" style="margin-top:30px;">Яйцо</div></div>`;
                lootData = `data-loot="egg" data-val="${color}"`;
            } else if (slotType.includes("Сокровище") && decks.treasures.length > 0) {
                let tr = decks.treasures.pop();
                inner += `<div class="card treasure" style="position:absolute; width:60px; height:80px; z-index:1;"><div class="card-title" style="margin-top:20px;">${tr}</div></div>`;
                lootData = `data-loot="treasure" data-val="${tr}"`;
            }
            
            slotsHtml += `<div class="slot" id="slot-${locIndex}-${slotIndex}" ${lootData} onclick="placeDisk(this)">${inner}</div>`;
        });

        html += `<div class="location"><div class="dragons-area">${dragonsHtml}</div><div class="slots-area">${slotsHtml}</div></div>`;
    });
    
    document.getElementById('game-board').innerHTML = html;
    renderHand();
}

function renderHand() {
    let handHtml = '';
    gameState.players.blue.powers.forEach((power, index) => {
        if (gameState.players.blue.avail[index]) {
            handHtml += `<div class="hunter-disk team-blue" style="position:relative;" data-index="${index}" data-power="${power}" onclick="selectDisk(this)">${power}</div>`;
        }
    });
    document.getElementById('player-disks').innerHTML = handHtml;
}

// --- ЛОГИКА СБОРА ЛУТА И КОНТРАКТОВ ---
function claimLoot(slotElement, teamId) {
    let lootType = slotElement.dataset.loot;
    if (!lootType) return; // Нет лута

    let player = gameState.players[teamId];
    if (lootType === 'egg') {
        player.eggs.push(slotElement.dataset.val);
        logMsg(`🎁 ${player.name} забрал Яйцо (${slotElement.dataset.val})!`);
    } else if (lootType === 'treasure') {
        player.treasures.push(slotElement.dataset.val);
        logMsg(`🎁 ${player.name} забрал Сокровище (${slotElement.dataset.val})!`);
    }
    
    // Удаляем карточку лута из DOM и очищаем data-атрибуты
    let card = slotElement.querySelector('.card');
    if(card) card.remove();
    slotElement.removeAttribute('data-loot');
    slotElement.removeAttribute('data-val');
    
    renderInventories();
}

// --- ХОДЫ И ЗАСАДА ---
let selectedDisk = null;

function selectDisk(element) {
    document.querySelectorAll('.hunter-disk').forEach(el => el.classList.remove('selected'));
    selectedDisk = element;
    element.classList.add('selected');
}

function placeDisk(slotElement) {
    if (!selectedDisk) return alert("Выберите диск!");
    if (slotElement.querySelector('.hunter-disk')) return alert("Ячейка занята!");

    let diskIndex = selectedDisk.dataset.index;
    gameState.players.blue.avail[diskIndex] = false; 
    
    selectedDisk.classList.remove('selected');
    selectedDisk.style.position = 'absolute';
    selectedDisk.dataset.team = 'blue';
    slotElement.appendChild(selectedDisk);
    selectedDisk = null;
    
    claimLoot(slotElement, 'blue'); // СБОР ЛУТА ИГРОКОМ
    
    gameState.disksPlaced++;
    renderHand();
    
    document.getElementById('round-info').innerText = "Боты делают ход...";
    setTimeout(() => { botTurn('red'); setTimeout(() => { botTurn('green'); checkPhaseEnd(); }, 400); }, 400);
}

function botTurn(teamColor) {
    let emptySlots = Array.from(document.querySelectorAll('.slot')).filter(s => !s.querySelector('.hunter-disk'));
    if (emptySlots.length === 0) return;

    // Простой ИИ: если есть лут, бот ставит туда приоритетно
    let slot = emptySlots.find(s => s.hasAttribute('data-loot')) || emptySlots[Math.floor(Math.random() * emptySlots.length)];
    
    let diskIndex = gameState.players[teamColor].avail.findIndex(a => a === true);
    if (diskIndex === -1) return; 
    
    gameState.players[teamColor].avail[diskIndex] = false;
    let power = gameState.players[teamColor].powers[diskIndex];

    let diskEl = document.createElement('div');
    diskEl.className = `hunter-disk hidden-disk`; 
    diskEl.innerText = "?"; 
    diskEl.dataset.team = teamColor;
    diskEl.dataset.power = power;
    diskEl.dataset.index = diskIndex;
    
    slot.appendChild(diskEl);
    claimLoot(slot, teamColor); // СБОР ЛУТА БОТОМ
    
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

// --- ФАЗА ИСХОДА (ПРОРЫВ) ---
function logMsg(text, type="") {
    const logBox = document.getElementById('battle-log');
    logBox.style.display = 'block';
    logBox.innerHTML += `<p class="${type}">${text}</p>`;
    logBox.scrollTop = logBox.scrollHeight;
}

async function resolvePhaseAsync() {
    document.getElementById('resolve-btn').style.display = 'none';
    logMsg("=== НАЧАЛО ФАЗЫ ИСХОДА ===", "log-move");

    let locations = document.querySelectorAll('.location');
    
    for (let locIndex = 0; locIndex < locations.length; locIndex++) {
        let loc = locations[locIndex];
        let dragons = Array.from(loc.querySelectorAll('.dragon-card')).reverse();
        let slots = Array.from(loc.querySelectorAll('.slot'));

        for (let dragonCard of dragons) {
            let dPower = parseInt(dragonCard.dataset.power);
            let dColor = dragonCard.dataset.color;
            let isCaught = false;

            dragonCard.classList.add('active-dragon');
            await delay(800);

            for (let slot of slots) {
                let disk = slot.querySelector('.hunter-disk');
                if (disk && disk.style.opacity !== '0') {
                    slot.classList.add('active-slot');
                    await delay(400);
                    
                    let hPower = parseInt(disk.dataset.power);
                    let hTeam = disk.dataset.team;
                    let hIndex = disk.dataset.index;
                    
                    if (disk.classList.contains('hidden-disk')) {
                        disk.classList.remove('hidden-disk');
                        disk.classList.add(`team-${hTeam}`);
                        disk.style.transform = "rotateY(0deg)";
                        disk.innerText = hPower;
                        await delay(600);
                    }

                    if (hPower >= dPower) {
                        logMsg(`✅ ${gameState.players[hTeam].name} ПОЙМАЛ дракона!`, "log-win");
                        gameState.players[hTeam].dragons.push(dColor); // ДРАКОН В ИНВЕНТАРЬ
                        renderInventories();
                        
                        dragonCard.style.opacity = '0'; 
                        disk.style.opacity = '0';       
                        await delay(400);
                        slot.classList.remove('active-slot');
                        isCaught = true;
                        break; 
                    } else {
                        dPower -= hPower; 
                        dragonCard.dataset.power = dPower;
                        dragonCard.classList.add('clash-anim');
                        dragonCard.querySelector('.power').innerText = dPower;
                        
                        gameState.players[hTeam].powers[hIndex]++; // ПРОКАЧКА +1
                        renderInventories();
                        
                        logMsg(`❌ Змей ослаблен до ${dPower}. Охотник получает +1 к силе!`, "log-fail");
                        
                        await delay(400);
                        dragonCard.classList.remove('clash-anim');
                        disk.style.opacity = '0'; 
                        slot.classList.remove('active-slot');
                    }
                }
            }
            if (!isCaught) { dragonCard.style.opacity = '0.2'; await delay(300); }
        }
        
        // Убираем пустых охотников
        for (let slot of slots) {
            let disk = slot.querySelector('.hunter-disk');
            if (disk && disk.style.opacity !== '0') { disk.style.opacity = '0'; await delay(100); }
        }
    }
    
    logMsg(`<b>=== РАУНД ${gameState.round} ЗАВЕРШЕН ===</b>`, "log-move");
    document.getElementById('next-round-btn').style.display = 'block';
}

function nextRound() {
    if (gameState.round >= gameState.maxRounds) {
        alert("ИГРА ОКОНЧЕНА! Переходим к подсчету очков (Будет в следующем обновлении)");
        return;
    }
    gameState.round++;
    startRound();
}

// Запуск игры
initDecks();
generateContracts();
startRound();
