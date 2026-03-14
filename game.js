// === ФАЙЛ: game.js ===

window.initDraft = function(botCount) {
    document.getElementById('start-screen').style.display = 'none';
    
    gameState.botCount = botCount;
    gameState.totalDisksRound = (botCount + 1) * 3;

    gameState.players = { 
        blue: { name: 'Вы', isBot: false, powers: [1,2,3], avail: [true,true,true], trophies: [] } 
    };
    
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

    let pool = window.shuffle([...captainsDb]);
    let opt1 = pool.pop(); 
    let opt2 = pool.pop();

    let html = `
        <div class="captain-card" onclick="window.selectCaptain('blue', '${opt1.id}')">
            <div class="captain-title">${opt1.name}</div>
            <div class="captain-desc">${opt1.desc}</div>
        </div>
        <div class="captain-card" onclick="window.selectCaptain('blue', '${opt2.id}')">
            <div class="captain-title">${opt2.name}</div>
            <div class="captain-desc">${opt2.desc}</div>
        </div>
    `;
    
    document.getElementById('draft-options').innerHTML = html;
    document.getElementById('draft-screen').style.display = 'block';

    turnOrder.forEach(team => { 
        if (team !== 'blue') {
            gameState.players[team].captain = pool.pop(); 
        }
    });
};

window.selectCaptain = function(team, capId) {
    gameState.players[team].captain = captainsDb.find(c => c.id === capId);
    document.getElementById('draft-screen').style.display = 'none';
    
    for (let id in gameState.players) { 
        if (gameState.players[id].captain.id === 'sylvia') {
            gameState.players[id].powers = [2, 3, 4]; 
        }
    }
    
    window.initDecks(); 
    window.generateContracts(); 
    window.startRound();
};

window.generateContracts = function() {
    let cColors = window.shuffle([...colors]); 
    gameState.contracts = [
        { title: "Собрать 3", req: 3, points: 4, color: cColors[0], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Собрать 4", req: 4, points: 6, color: cColors[1], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Собрать 5", req: 5, points: 9, color: cColors[2], type: "regular", treasure: decks.treasures.pop(), winner: null },
        { title: "Больше всех", req: 0, points: 10, color: cColors[3], type: "majority", treasure: null, winner: null }
    ];
    window.renderContracts();
};

window.checkContractsInstant = function(teamId) {
    let changed = false;
    
    gameState.contracts.forEach(c => {
        if (c.winner || c.type === 'majority') {
            return; 
        }
        
        let count = gameState.players[teamId].trophies.filter(t => t.color === c.color).length;
        if (count >= c.req) {
            c.winner = teamId;
            if (c.treasure) { 
                gameState.players[teamId].trophies.push(c.treasure); 
                c.treasure = null; 
            }
            window.logMsg(`🏆 ${gameState.players[teamId].name} выполнил контракт "${c.title}"!`, 'log-move');
            changed = true;
        }
    });
    
    if (changed) { 
        window.renderContracts(); 
        window.renderInventories(); 
    }
};

window.botRecolorWhite = function(team) {
    let whites = gameState.players[team].trophies.filter(t => t.color === 'white');
    if (whites.length === 0) {
        return;
    }
    
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
        window.logMsg(`🤖 ${gameState.players[team].name} перекрасил белую карту в ${chosenColor}!`, "log-move");
    });
    
    if (changed) { 
        window.renderInventories(); 
        window.checkContractsInstant(team); 
    }
};

window.startRound = function() {
    document.getElementById('game-ui').style.display = 'block';
    gameState.disksPlaced = 0;
    firstPlayerIndex = (gameState.round - 1) % turnOrder.length; 
    currentTurnIndex = firstPlayerIndex;
    
    for (let id in gameState.players) { 
        gameState.players[id].avail = [true, true, true]; 
        gameState.captainsUsedRound[id] = false; 
    }
    
    document.getElementById('action-header').style.display = 'none';
    window.renderInventories(); 
    window.renderBoard();
    
    let activeTeam = turnOrder[currentTurnIndex];
    
    if (activeTeam === 'blue') {
        document.getElementById('round-info').innerText = `Раунд ${gameState.round}/5 | Ваш ход (Вы первый!)`;
    } else {
        document.getElementById('round-info').innerText = `Раунд ${gameState.round}/5 | Начинает ${gameState.players[activeTeam].name}...`;
    }
    
    window.updateCaptainButton();
    
    if (gameState.players[activeTeam].isBot) {
        setTimeout(() => window.botTurn(activeTeam), 1000);
    }
};

window.nextTurn = function() {
    if (gameState.disksPlaced >= gameState.totalDisksRound) {
        document.getElementById('round-info').innerText = "Засада окончена! Начинается прорыв!";
        document.getElementById('resolve-btn').style.display = 'block'; 
        document.getElementById('captain-btn').style.display = 'none'; 
        return;
    }
    
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length; 
    let activeTeam = turnOrder[currentTurnIndex];
    
    if (activeTeam === 'blue') {
        document.getElementById('round-info').innerText = `Ваш ход (Выберите диск)`;
    } else {
        document.getElementById('round-info').innerText = `${gameState.players[activeTeam].name} делает ход...`;
    }
    
    window.updateCaptainButton();
    
    if (gameState.players[activeTeam].isBot) {
        setTimeout(() => window.botTurn(activeTeam), 1000);
    }
};

// ==== ИГРОК: ХОД И ДЕЙСТВИЯ ====
let selectedDisk = null;

window.selectDisk = function(element) {
    if (gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue') {
        return;
    }
    document.querySelectorAll('.hunter-disk').forEach(el => el.classList.remove('selected'));
    selectedDisk = element; 
    element.classList.add('selected');
};

window.placeDisk = async function(slotElement, locIndex) {
    if (gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue' || !selectedDisk || slotElement.querySelector('.hunter-disk')) {
        return;
    }
    
    gameState.isActionPaused = true;
    
    let dIndex = selectedDisk.dataset.index; 
    gameState.players.blue.avail[dIndex] = false; 
    
    selectedDisk.classList.remove('selected'); 
    selectedDisk.style.position = 'absolute'; 
    selectedDisk.dataset.team = 'blue';
    slotElement.appendChild(selectedDisk); 
    selectedDisk = null;

    let slotToLoot = slotElement;
    if (gameState.players.blue.captain && gameState.players.blue.captain.id === 'corvo') {
        slotToLoot = await window.handleCorvo('blue', slotElement, locIndex);
    }
    
    let bonus = slotToLoot.dataset.bonus;
    if (bonus && bonus.startsWith('loot') && slotToLoot.dataset.obj) {
        gameState.players.blue.trophies.push(JSON.parse(slotToLoot.dataset.obj));
        let c = slotToLoot.querySelector('.card'); 
        if (c) {
            c.remove(); 
        }
        slotToLoot.removeAttribute('data-obj');
        
        window.renderInventories(); 
        window.checkContractsInstant('blue'); 
        window.finalizePlayerTurn();
    } else if (bonus === 'upgrade') {
        window.showUpgradeModal('blue').then(() => window.finalizePlayerTurn());
    } else if (bonus === 'swap') {
        window.startSwap(locIndex).then(() => window.finalizePlayerTurn());
    } else {
        window.finalizePlayerTurn();
    }
};

window.finalizePlayerTurn = function() {
    gameState.isActionPaused = false; 
    document.getElementById('action-header').style.display = 'none';
    gameState.disksPlaced++; 
    window.renderHand(); 
    window.nextTurn();
};

window.updateCaptainButton = function() {
    let cap = gameState.players.blue.captain; 
    let btn = document.getElementById('captain-btn');
    
    if (turnOrder[currentTurnIndex] === 'blue' && cap && cap.phase === 'ambush_active' && !gameState.captainsUsedRound.blue) {
        btn.style.display = 'block'; 
    } else {
        btn.style.display = 'none';
    }
};

window.useCaptainAbility = function() {
    let cap = gameState.players.blue.captain.id;
    if (cap === 'bramm') window.startBramm('blue'); 
    if (cap === 'sylvia') window.startSylvia('blue'); 
    if (cap === 'quint') window.startQuint('blue');
};

window.handleCorvo = async function(team, originalSlot, locIndex) {
    let loc = document.getElementById(`loc-${locIndex}`);
    let otherBonusSlots = Array.from(loc.querySelectorAll('.slot')).filter(s => s !== originalSlot && !s.querySelector('.hunter-disk') && s.dataset.bonus);
    
    if (otherBonusSlots.length === 0) {
        return originalSlot; 
    }
    
    let html = `<h4>Откуда забрать бонус?</h4><div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">`;
    
    otherBonusSlots.forEach((s, idx) => {
        let bText = "Награда";
        if (s.hasAttribute('data-obj')) { 
            let obj = JSON.parse(s.dataset.obj); 
            if (obj.type === 'treasure') bText = `💎 ${obj.name}`; 
            if (obj.type === 'egg') bText = `🥚 Яйцо (${obj.color})`; 
        } else if (s.dataset.bonus === 'upgrade') {
            bText = "🎩 Усиление"; 
        } else if (s.dataset.bonus === 'swap') {
            bText = "🔄 Обмен";
        }
        html += `<button style="padding:10px; cursor:pointer;" onclick="window.resolveGeneric(${idx})">${bText}</button>`;
    });
    
    html += `</div>`;
    
    let chosenIdx = await window.showGenericModal("Адмирал Корво", "Вы можете перехватить награду с соседней пустой клетки!", html);
    
    if (chosenIdx !== null) { 
        window.logMsg(`⚓ Корво перехватил соседнюю награду!`, "log-move"); 
        return otherBonusSlots[chosenIdx]; 
    }
    
    return originalSlot;
};

window.startBramm = async function(team) {
    let drags = gameState.players[team].trophies.filter(t => t.type === 'dragon');
    let avail = gameState.players[team].avail.map((a,i) => a ? i : -1).filter(i => i !== -1);
    
    if (drags.length === 0 || avail.length === 0) {
        return alert("Нет драконов или свободных дисков!");
    }
    
    let html = `<h4>1. Выберите дракона для сброса:</h4>`;
    drags.forEach((d, index) => { 
        html += `<div class="card ${d.color}" style="display:inline-block; transform:scale(0.8); cursor:pointer;" onclick="window.resolveGeneric({step:1, dragIdx:${index}})">👑${d.crowns} <br> 💪${d.power}</div>`; 
    });
    
    let res1 = await window.showGenericModal("Брамм 'Мёртвый узел'", "Сбросьте дракона, чтобы получить +Силу", html); 
    if (!res1) {
        return;
    }
    
    let chosenDrag = drags[res1.dragIdx]; 
    let html2 = `<h4>2. Кого усилить на +${chosenDrag.crowns}?</h4>`;
    
    avail.forEach(i => { 
        html2 += `<div class="hunter-disk team-${team}" style="position:relative; cursor:pointer;" onclick="window.resolveGeneric(${i})">${gameState.players[team].powers[i]}</div>`; 
    });
    
    let res2 = await window.showGenericModal("Брамм 'Мёртвый узел'", "", html2); 
    if (res2 === null) {
        return;
    }
    
    gameState.players[team].powers[res2] += chosenDrag.crowns;
    let globalDragIdx = gameState.players[team].trophies.indexOf(chosenDrag); 
    
    if (globalDragIdx > -1) {
        gameState.players[team].trophies.splice(globalDragIdx, 1);
    }
    
    gameState.captainsUsedRound[team] = true; 
    window.renderInventories(); 
    window.updateCaptainButton(); 
    window.logMsg(`⚓ Брамм сбросил дракона и усилился на +${chosenDrag.crowns}!`);
};

window.startSylvia = async function(team) {
    let hidden = document.querySelectorAll('.hidden-disk');
    if (hidden.length === 0) {
        return alert("На поле нет скрытых дисков!");
    }
    
    document.getElementById('action-header').style.display = 'block'; 
    document.getElementById('action-header').innerText = "Сильвия: Кликните на любой серый диск!"; 
    document.body.classList.add('peek-mode');
    
    return new Promise(resolve => {
        let handler = function(e) {
            if (e.target.classList.contains('hidden-disk')) {
                let disk = e.target; 
                disk.classList.remove('hidden-disk'); 
                disk.classList.add(`team-${disk.dataset.team}`); 
                disk.innerText = disk.dataset.power;
                
                setTimeout(() => {
                    disk.classList.add('hidden-disk'); 
                    disk.classList.remove(`team-${disk.dataset.team}`); 
                    disk.innerText = "?"; 
                    document.body.classList.remove('peek-mode'); 
                    document.getElementById('action-header').style.display = 'none';
                    hidden.forEach(h => h.removeEventListener('click', handler)); 
                    gameState.captainsUsedRound[team] = true; 
                    window.updateCaptainButton(); 
                    window.logMsg(`⚓ Сильвия подсмотрела диск!`); 
                    resolve();
                }, 2000);
            }
        };
        hidden.forEach(h => h.addEventListener('click', handler));
        
        document.getElementById('gm-cancel').onclick = function() { 
            document.body.classList.remove('peek-mode'); 
            document.getElementById('action-header').style.display = 'none'; 
            hidden.forEach(h => h.removeEventListener('click', handler)); 
            resolve(); 
        };
    });
};

window.startQuint = async function(team) {
    let avail = gameState.players[team].avail.map((a,i) => a ? i : -1).filter(i => i !== -1); 
    let validDisks = avail.filter(i => gameState.players[team].powers[i] > 1);
    if (validDisks.length === 0) {
        return alert("Нет доступных дисков с силой > 1!");
    }
    
    let validContracts = gameState.contracts.filter(c => !c.winner && c.type !== 'majority' && gameState.players[team].trophies.filter(t => t.color === c.color).length === c.req - 1);
    if (validContracts.length === 0) {
        return alert("Нет контрактов, где не хватает ровно 1 карты!");
    }
    
    let html = `<h4>1. Выберите диск, чтобы пожертвовать -1 силы:</h4>`; 
    validDisks.forEach(i => { 
        html += `<div class="hunter-disk team-${team}" style="position:relative; cursor:pointer;" onclick="window.resolveGeneric(${i})">${gameState.players[team].powers[i]}</div>`; 
    });
    
    let diskIdx = await window.showGenericModal("Квинт 'Золотой Змей'", "Пожертвуйте силу ради контракта", html); 
    if (diskIdx === null) {
        return;
    }
    
    let html2 = `<h4>2. Какой контракт забрать?</h4>`; 
    validContracts.forEach((c, idx) => { 
        html2 += `<button style="padding:10px; margin:5px; border:2px solid ${c.color}; cursor:pointer;" onclick="window.resolveGeneric(${idx})">${c.title}</button>`; 
    });
    
    let cIdx = await window.showGenericModal("Квинт 'Золотой Змей'", "", html2); 
    if (cIdx === null) {
        return;
    }
    
    gameState.players[team].powers[diskIdx] -= 1; 
    let chosenContract = validContracts[cIdx]; 
    chosenContract.winner = team;
    
    if (chosenContract.treasure) { 
        gameState.players[team].trophies.push(chosenContract.treasure); 
        chosenContract.treasure = null; 
    }
    
    gameState.captainsUsedRound[team] = true; 
    window.renderInventories(); 
    window.renderContracts(); 
    window.updateCaptainButton(); 
    window.logMsg(`⚓ Квинт пожертвовал силой и мгновенно забрал контракт "${chosenContract.title}"!`, "log-move");
};

// === БОТ ===
window.botTurn = function(team) {
    let emptySlots = Array.from(document.querySelectorAll('.slot')).filter(s => !s.querySelector('.hunter-disk'));
    let availIndices = gameState.players[team].avail.map((a, i) => a ? i : -1).filter(i => i !== -1);
    
    if (emptySlots.length === 0 || availIndices.length === 0) {
        return;
    }

    let cap = gameState.players[team].captain.id; 
    let usedCap = gameState.captainsUsedRound[team];

    if (cap === 'quint' && !usedCap) {
        let validContracts = gameState.contracts.filter(c => !c.winner && c.type !== 'majority' && gameState.players[team].trophies.filter(t => t.color === c.color).length === c.req - 1);
        let strongDisks = availIndices.filter(i => gameState.players[team].powers[i] > 1);
        if (validContracts.length > 0 && strongDisks.length > 0) {
            gameState.players[team].powers[strongDisks[0]] -= 1; 
            validContracts[0].winner = team;
            if (validContracts[0].treasure) { 
                gameState.players[team].trophies.push(validContracts[0].treasure); 
                validContracts[0].treasure = null; 
            }
            gameState.captainsUsedRound[team] = true; 
            window.logMsg(`🤖 Квинт (${team}) пожертвовал силой и взял контракт!`);
        }
    }

    if (cap === 'bramm' && !usedCap) {
        let weakDragIdx = gameState.players[team].trophies.findIndex(t => t.type === 'dragon' && t.crowns === 1);
        if (weakDragIdx > -1) {
            let drag = gameState.players[team].trophies[weakDragIdx]; 
            gameState.players[team].powers[availIndices[0]] += drag.crowns;
            gameState.players[team].trophies.splice(weakDragIdx, 1); 
            gameState.captainsUsedRound[team] = true; 
            window.logMsg(`🤖 Брамм (${team}) сбросил дракона ради силы!`);
        }
    }

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
    
    let slotToLoot = bestMove.slot;
    if (cap === 'corvo') {
        let otherBonus = Array.from(bestMove.slot.closest('.location').querySelectorAll('.slot')).filter(s => s !== bestMove.slot && !s.querySelector('.hunter-disk') && s.hasAttribute('data-obj'));
        if (otherBonus.length > 0) { 
            slotToLoot = otherBonus[0]; 
            window.logMsg(`🤖 Корво (${team}) перехватил соседний лут!`); 
        }
    }

    let bonus = slotToLoot.dataset.bonus;
    if (bonus && bonus.startsWith('loot') && slotToLoot.dataset.obj) {
        gameState.players[team].trophies.push(JSON.parse(slotToLoot.dataset.obj));
        let c = slotToLoot.querySelector('.card'); 
        if (c) {
            c.remove(); 
        }
        slotToLoot.removeAttribute('data-obj');
        
        window.checkContractsInstant(team); 
        window.botRecolorWhite(team); 
    } else if (bonus === 'upgrade') {
        let avail = gameState.players[team].avail.findIndex(a => a === true); 
        if (avail !== -1) {
            gameState.players[team].powers[avail]++; 
        }
    } else if (bonus === 'swap') {
        let loc = slotToLoot.closest('.location'); 
        let d = Array.from(loc.querySelectorAll('.dragon-card')); 
        if (d.length > 1) {
            loc.querySelector('.dragons-area').insertBefore(d[1], d[0]); 
        }
    }
    
    window.renderInventories(); 
    gameState.disksPlaced++; 
    window.nextTurn();
};

// === ФАЗА РЕШЕНИЯ (ПРОРЫВ) ===
window.resolvePhaseAsync = async function() {
    document.getElementById('resolve-btn').style.display = 'none'; 
    document.getElementById('captain-btn').style.display = 'none';
    
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
                    
                    let cap = gameState.players[hTeam].captain.id; 
                    let usedCap = gameState.captainsUsedRound[hTeam];

                    if (disk.classList.contains('hidden-disk')) { 
                        disk.className = `hunter-disk team-${hTeam}`; 
                        disk.innerText = hPower; 
                        await delay(700); 
                    }

                    if (cap === 'iris' && !usedCap) {
                        if (hTeam === 'blue') {
                            let use = await window.showGenericModal("Железная Ирис", "Использовать бонус +2 силы к этому диску?", `<button class="color-btn" style="background:#2ecc71;" onclick="window.resolveGeneric(true)">Да (+2)</button>`);
                            if (use) { 
                                hPower += 2; 
                                disk.innerText = hPower; 
                                gameState.players[hTeam].powers[hIndex] += 2; 
                                gameState.captainsUsedRound[hTeam] = true; 
                                window.logMsg(`⚓ Ирис применяет способность! (+2)`); 
                                await delay(500); 
                            }
                        } else {
                            if (hPower < dPower && hPower + 2 >= dPower) { 
                                hPower += 2; 
                                disk.innerText = hPower; 
                                gameState.players[hTeam].powers[hIndex] += 2; 
                                gameState.captainsUsedRound[hTeam] = true; 
                                window.logMsg(`🤖 Ирис (${hTeam}) внезапно дает +2 силы!`); 
                                await delay(500); 
                            }
                        }
                    }

                    if (hPower >= dPower) {
                        let basePower = parseInt(dCard.dataset.basepower); 
                        let isOrigWhite = dCard.dataset.color === 'white'; 
                        let finalColor = dCard.dataset.color;
                        
                        if (cap === 'eleonora' && !usedCap) {
                            if (hTeam === 'blue') {
                                let html = `<div style="display:flex; gap:5px;"><button class="color-btn red" onclick="window.resolveGeneric('red')">К</button><button class="color-btn green" onclick="window.resolveGeneric('green')">З</button><button class="color-btn yellow" onclick="window.resolveGeneric('yellow')">Ж</button><button class="color-btn purple" onclick="window.resolveGeneric('purple')">Ф</button></div>`;
                                let chosen = await window.showGenericModal("Мадам Элеонора", "Перекрасить этого дракона?", html);
                                if (chosen) { 
                                    finalColor = chosen; 
                                    gameState.captainsUsedRound[hTeam] = true; 
                                    window.logMsg(`⚓ Элеонора перекрасила дракона в ${chosen}!`); 
                                }
                            } else {
                                for (let c of gameState.contracts) {
                                    if (!c.winner && c.type !== 'majority' && gameState.players[hTeam].trophies.filter(t => t.color === c.color).length + 1 >= c.req) { 
                                        finalColor = c.color; 
                                        gameState.captainsUsedRound[hTeam] = true; 
                                        window.logMsg(`🤖 Элеонора (${hTeam}) перекрасила дракона в ${finalColor}!`); 
                                        break; 
                                    }
                                }
                            }
                        }

                        gameState.players[hTeam].trophies.push({ type: 'dragon', color: finalColor, power: basePower, crowns: parseInt(dCard.dataset.crowns), isOriginallyWhite: isOrigWhite });
                        
                        if (cap === 'hector') { 
                            gameState.players[hTeam].powers[hIndex] = Math.min(8, gameState.players[hTeam].powers[hIndex] + 2); 
                            window.logMsg(`⚓ Гектор качает драконьера на +2!`); 
                        }

                        window.renderInventories(); 
                        dCard.style.opacity = '0'; 
                        disk.style.opacity = '0'; 
                        slot.classList.remove('active-slot'); 
                        window.logMsg(`✅ ${gameState.players[hTeam].name} ПОЙМАЛ дракона!`, "log-win");
                        
                        window.checkContractsInstant(hTeam); 
                        if (isOrigWhite && gameState.players[hTeam].isBot && cap !== 'eleonora') {
                            window.botRecolorWhite(hTeam); 
                        }
                        
                        isCaught = true; 
                        break; 
                    } else {
                        dPower -= hPower; 
                        dCard.dataset.power = dPower; 
                        dCard.querySelector('.power').innerText = dPower; 
                        dCard.classList.add('clash-anim');
                        
                        if (cap === 'thorvald') { 
                            gameState.players[hTeam].powers[hIndex] += 2; 
                            window.logMsg(`❌ Прорыв! Торвальд качает драконьера на +2!`, "log-fail");
                        } else if (cap === 'hector') { 
                            gameState.players[hTeam].powers[hIndex] = Math.max(1, gameState.players[hTeam].powers[hIndex] - 1); 
                            window.logMsg(`❌ Прорыв! Гектор штрафует драконьера на -1!`, "log-fail");
                        } else { 
                            gameState.players[hTeam].powers[hIndex]++; 
                            window.logMsg(`❌ Змей ослаблен до ${dPower}. Охотник получает +1 к силе!`, "log-fail"); 
                        }
                        
                        window.renderInventories(); 
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
            if (disk) {
                disk.style.opacity = '0'; 
            }
        }
    }
    document.getElementById('next-round-btn').style.display = 'block';
};

window.nextRound = function() { 
    if (gameState.round === 5) { 
        window.calculateFinalScores(); 
        return; 
    } 
    gameState.round++; 
    window.startRound(); 
};
