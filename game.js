// === ФАЙЛ: game.js ===

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
        <div class="captain-card" onclick="selectCaptain('blue', '${opt1.id}')">
            <div class="captain-title">${opt1.name}</div>
            <div class="captain-desc">${opt1.desc}</div>
        </div>
        <div class="captain-card" onclick="selectCaptain('blue', '${opt2.id}')">
            <div class="captain-title">${opt2.name}</div>
            <div class="captain-desc">${opt2.desc}</div>
        </div>
    `;
    
    document.getElementById('draft-options').innerHTML = html;
    document.getElementById('draft-screen').style.display = 'block';

    turnOrder.forEach(team => { 
        if(team !== 'blue') gameState.players[team].captain = pool.pop(); 
    });
}

function selectCaptain(team, capId) {
    gameState.players[team].captain = captainsDb.find(c => c.id === capId);
    document.getElementById('draft-screen').style.display = 'none';
    
    for(let id in gameState.players) { 
        if(gameState.players[id].captain.id === 'sylvia') gameState.players[id].powers = [2,3,4]; 
    }
    
    initDecks(); 
    generateContracts(); 
    startRound();
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

function checkContractsInstant(teamId) {
    let changed = false;
    gameState.contracts.forEach(c => {
        if (c.winner || c.type === 'majority') return; 
        
        if (gameState.players[teamId].trophies.filter(t => t.color === c.color).length >= c.req) {
            c.winner = teamId;
            if (c.treasure) { 
                gameState.players[teamId].trophies.push(c.treasure); 
                c.treasure = null; 
            }
            logMsg(`🏆 ${gameState.players[teamId].name} выполнил контракт "${c.title}"!`, 'log-move');
            changed = true;
        }
    });
    if (changed) { renderContracts(); renderInventories(); }
}

function botRecolorWhite(team) {
    let whites = gameState.players[team].trophies.filter(t => t.color === 'white');
    if (whites.length === 0) return;
    
    let changed = false;
    whites.forEach(w => {
        let chosenColor = colors[Math.floor(Math.random() * colors.length)]; 
        for (let c of gameState.contracts) {
            if (!c.winner && c.type !== 'majority') {
                if (gameState.players[team].trophies.filter(t => t.color === c.color).length + 1 >= c.req) { 
                    chosenColor = c.color; break; 
                }
            }
        }
        w.color = chosenColor; changed = true; 
        logMsg(`🤖 ${gameState.players[team].name} перекрасил белую карту в ${chosenColor}!`, "log-move");
    });
    
    if (changed) { renderInventories(); checkContractsInstant(team); }
}

function startRound() {
    document.getElementById('game-ui').style.display = 'block';
    gameState.disksPlaced = 0;
    firstPlayerIndex = (gameState.round - 1) % turnOrder.length; 
    currentTurnIndex = firstPlayerIndex;
    
    for (let id in gameState.players) { 
        gameState.players[id].avail = [true, true, true]; 
        gameState.captainsUsedRound[id] = false; 
    }
    
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
        document.getElementById('resolve-btn').style.display = 'block'; 
        document.getElementById('captain-btn').style.display = 'none'; 
        return;
    }
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length; 
    let activeTeam = turnOrder[currentTurnIndex];
    document.getElementById('round-info').innerText = activeTeam === 'blue' ? `Ваш ход (Выберите диск)` : `${gameState.players[activeTeam].name} делает ход...`;
    updateCaptainButton();
    
    if (gameState.players[activeTeam].isBot) setTimeout(() => botTurn(activeTeam), 1000);
}

// ==== ИГРОК ====
let selectedDisk = null;

function selectDisk(element) {
    if (gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue') return;
    document.querySelectorAll('.hunter-disk').forEach(el => el.classList.remove('selected'));
    selectedDisk = element; 
    element.classList.add('selected');
}

async function placeDisk(slotElement, locIndex) {
    if (gameState.isActionPaused || turnOrder[currentTurnIndex] !== 'blue' || !selectedDisk || slotElement.querySelector('.hunter-disk')) return;
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
        slotToLoot = await handleCorvo('blue', slotElement, locIndex);
    }
    
    let bonus = slotToLoot.dataset.bonus;
    if (bonus && bonus.startsWith('loot') && slotToLoot.dataset.obj) {
        gameState.players.blue.trophies.push(JSON.parse(slotToLoot.dataset.obj));
        let c = slotToLoot.querySelector('.card'); if (c) c.remove(); slotToLoot.removeAttribute('data-obj');
        renderInventories(); checkContractsInstant('blue'); finalizePlayerTurn();
    } else if (bonus === 'upgrade') {
        showUpgradeModal('blue').then(() => finalizePlayerTurn());
    } else if (bonus === 'swap') {
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

function updateCaptainButton() {
    let cap = gameState.players.blue.captain; 
    let btn = document.getElementById('captain-btn');
    if (turnOrder[currentTurnIndex] === 'blue' && cap && cap.phase === 'ambush_active' && !gameState.captainsUsedRound.blue) {
        btn.style.display = 'block'; 
    } else {
        btn.style.display = 'none';
    }
}

function useCaptainAbility() {
    let cap = gameState.players.blue.captain.id;
    if (cap === 'bramm') startBramm('blue'); 
    if (cap === 'sylvia') startSylvia('blue'); 
    if (cap === 'quint') startQuint('blue');
}

async function handleCorvo(team, originalSlot, locIndex) {
    let loc = document.getElementById(`loc-${locIndex}`);
    let otherBonusSlots = Array.from(loc.querySelectorAll('.slot')).filter(s => s !== originalSlot && !s.querySelector('.hunter-disk') && s.dataset.bonus);
    
    if(otherBonusSlots.length === 0) return originalSlot; 
    
    let html = `<h4>Откуда забрать бонус?</h4><div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">`;
    otherBonusSlots.forEach((s, idx) => {
        let bText = "Награда";
        if(s.hasAttribute('data-obj')) { 
            let obj = JSON.parse(s.dataset.obj); 
            if(obj.type === 'treasure') bText = `💎 ${obj.name}`; 
            if(obj.type === 'egg') bText = `🥚 Яйцо (${obj.color})`; 
        } else if (s.dataset.bonus === 'upgrade') bText = "🎩 Усиление"; 
        else if (s.dataset.bonus === 'swap') bText = "🔄 Обмен";
        html += `<button style="padding:10px; cursor:pointer;" onclick="resolveGeneric(${idx})">${bText}</button>`;
    });
    html += `</div>`;
    
    let chosenIdx = await showGenericModal("Адмирал Корво", "Вы можете перехватить награду с соседней пустой клетки!", html);
    if(chosenIdx !== null) { 
        logMsg(`⚓ Корво перехватил соседнюю награду!`, "log-move"); 
        return otherBonusSlots[chosenIdx]; 
    }
    return originalSlot;
}

async function startBramm(team) {
    let drags = gameState.players[team].trophies.filter(t => t.type === 'dragon');
    let avail = gameState.players[team].avail.map((a,i) => a?i:-1).filter(i=>i!==-1);
    
    if(drags.length === 0 || avail.length === 0) return alert("Нет драконов или свободных дисков!");
    
    let html = `<h4>1. Выберите дракона для сброса:</h4>`;
    drags.forEach((d, index) => { 
        html += `<div class="card ${d.color}" style="display:inline-block; transform:scale(0.8); cursor:pointer;" onclick="resolveGeneric({step:1, dragIdx:${index}})">👑${d.crowns} <br> 💪${d.power}</div>`; 
    });
    
    let res1 = await showGenericModal("Брамм 'Мёртвый узел'", "Сбросьте дракона, чтобы получить +Силу", html); 
    if(!res1) return;
    
    let chosenDrag = drags[res1.dragIdx]; 
    let html2 = `<h4>2. Кого усилить на +${chosenDrag.crowns}?</h4>`;
    avail.forEach(i => { 
        html2 += `<div class="hunter-disk team-${team}" style="position:relative; cursor:pointer;" onclick="resolveGeneric(${i})">${gameState.players[team].powers[i]}</div>`; 
    });
    
    let res2 = await showGenericModal("Брамм 'Мёртвый узел'", "", html2); 
    if(res2 === null) return;
    
    gameState.players[team].powers[res2] += chosenDrag.crowns;
    let globalDragIdx = gameState.players[team].trophies.indexOf(chosenDrag); 
    if(globalDragIdx > -1) gameState.players[team].trophies.splice(globalDragIdx, 1);
    
    gameState.captainsUsedRound[team] = true; 
    renderInventories(); updateCaptainButton(); 
    logMsg(`⚓ Брамм сбросил дракона и усилился на +${chosenDrag.crowns}!`);
}

async function startSylvia(team) {
    let hidden = document.querySelectorAll('.hidden-disk');
    if(hidden.length === 0) return alert("На поле нет скрытых дисков!");
    
    document.getElementById('action-header').style.display = 'block'; 
    document.getElementById('action-header').innerText = "Сильвия: Кликните на любой серый диск!"; 
    document.body.classList.add('peek-mode');
    
    return new Promise(resolve => {
        let handler = function(e) {
            if(e.target.classList.contains('hidden-disk')) {
                let disk = e.target; 
                disk.classList.remove('hidden-disk'); disk.classList.add(`team-${disk.dataset.team}`); disk.innerText = disk.dataset.power;
                setTimeout(() => {
                    disk.classList.add('hidden-disk'); disk.classList.remove(`team-${disk.dataset.team}`); disk.innerText = "?"; 
                    document.body.classList.remove('peek-mode'); document.getElementById('action-header').style.display = 'none';
                    hidden.forEach(h => h.removeEventListener('click', handler)); 
                    gameState.captainsUsedRound[team] = true; updateCaptainButton(); 
                    logMsg(`⚓ Сильвия подсмотрела диск!`); resolve();
                }, 2000);
            }
        };
        hidden.forEach(h => h.addEventListener('click', handler));
        document.getElementById('gm-cancel').onclick = function() { document.body.classList.remove('peek-mode'); document.getElementById('action-header').style.display = 'none'; hidden.forEach(h => h.removeEventListener('click', handler)); resolve(); };
    });
}

async function startQuint(team) {
    let avail = gameState.players[team].avail.map((a,i) => a?i:-1).filter(i=>i!==-1); 
    let validDisks = avail.filter(i => gameState.players[team].powers[i] > 1);
    if(validDisks.length === 0) return alert("Нет доступных дисков с силой > 1!");
    
    let validContracts = gameState.contracts.filter(c => !c.winner && c.type !== 'majority' && gameState.players[team].trophies.filter(t => t.color === c.color).length === c.req - 1);
    if(validContracts.length === 0) return alert("Нет контрактов, где не хватает ровно 1 карты!");
    
    let html = `<h4>1. Выберите диск, чтобы пожертвовать -1 силы:</h4>`; 
    validDisks.forEach(i => { html += `<div class="hunter-disk team-${team}" style="position:relative; cursor:pointer;" onclick="resolveGeneric(${i})">${gameState.players[team].powers[i]}</div>`; });
    let diskIdx = await showGenericModal("Квинт 'Золотой Змей'", "Пожертвуйте силу ради контракта", html); if(diskIdx === null) return;
    
    let html2 = `<h4>2. Какой контракт забрать?</h4>`; 
    validContracts.forEach((c, idx) => { html2 += `<button style="padding:10px; margin:5px; border:2px solid ${c.color}; cursor:pointer;" onclick="resolveGeneric(${idx})">${c.title}</button>`; });
    let cIdx = await showGenericModal("Квинт 'Золотой Змей'", "", html2); if(cIdx === null) return;
    
    gameState.players[team].powers[diskIdx] -= 1; 
    let chosenContract = validContracts[cIdx]; chosenContract.winner = team;
    if(chosenContract.treasure) { gameState.players[team].trophies.push(chosenContract.treasure); chosenContract.treasure = null; }
    
    gameState.captainsUsedRound[team] = true; 
    renderInventories(); renderContracts(); updateCaptainButton(); 
    logMsg(`⚓ Квинт пожертвовал силой и мгновенно забрал контракт "${chosenContract.title}"!`, "log-move");
}

function botTurn(team) {
    let emptySlots = Array.from(document.querySelectorAll('.slot')).filter(s => !s.querySelector('.hunter-disk'));
    let availIndices = gameState.players[team].avail.map((a, i) => a ? i : -1).filter(i => i !== -1);
    
    if (emptySlots.length === 0 || availIndices.length === 0) return;

    let cap = gameState.players[team].captain.id; 
    let usedCap = gameState.captainsUsedRound[team];

    if (cap === 'quint' && !usedCap) {
        let validContracts = gameState.contracts.filter(c => !c.winner && c.type !== 'majority' && gameState.players[team].trophies.filter(t => t.color === c.color).length === c.req - 1);
        let strongDisks = availIndices.filter(i => gameState.players[team].powers[i] > 1);
        if(validContracts.length > 0 && strongDisks.length > 0) {
            gameState.players[team].powers[strongDisks[0]] -= 1; 
            validContracts[0].winner = team;
            if(validContracts[0].treasure) { gameState.players[team].trophies.push(validContracts[0].treasure); validContracts[0].treasure = null; }
            gameState.captainsUsedRound[team] = true; 
            logMsg(`🤖 Квинт (${team}) пожертвовал силой и взял контракт!`);
        }
    }

    if (cap === 'bramm' && !usedCap) {
        let weakDragIdx = gameState.players[team].trophies.findIndex(t => t.type === 'dragon' && t.crowns === 1);
        if(weakDragIdx > -1) {
            let drag = gameState.players[team].trophies[weakDragIdx]; 
            gameState.players[team].powers[availIndices[0]] += drag.crowns;
            gameState.players[team].trophies.splice(weakDragIdx, 1); 
            gameState.captainsUsedRound[team] = true; 
            logMsg(`🤖 Брамм (${team}) сбросил дракона ради силы!`);
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
                if (power >= dPower) { 
                    score += 4; gameState.contracts.forEach(c => { if (!c.winner && c.color === d.dataset.color) score += 10; }); 
                } else score += 2; 
            });
            if (score > maxScore) { maxScore = score; bestMove = { slot, dIndex }; }
        });
    });

    gameState.players[team].avail[bestMove.dIndex] = false;
    let diskEl = document.createElement('div'); diskEl.className = `hunter-disk hidden-disk`; diskEl.innerText = "?"; 
    diskEl.dataset.team = team; diskEl.dataset.power = gameState.players[team].powers[bestMove.dIndex]; diskEl.dataset.index = bestMove.dIndex;
    bestMove.slot.appendChild(diskEl);
    
    let slotToLoot = bestMove.slot;
    if (cap === 'corvo') {
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
        let loc = slotToLoot.closest('.location'); let d = Array.from(loc.querySelectorAll('.dragon-card')); if (d.length > 1)                    let hTeam = disk.dataset.team; let hIndex = disk.dataset.index; let hPower = parseInt(disk.dataset.power);
                    let cap = gameState.players[hTeam].captain.id; let usedCap = gameState.captainsUsedRound[hTeam];

                    if (disk.classList.contains('hidden-disk')) { disk.className = `hunter-disk team-${hTeam}`; disk.innerText = hPower; await delay(700); }

                    if (cap === 'iris' && !usedCap) {
                        if (hTeam === 'blue') {
                            let use = await showGenericModal("Железная Ирис", "Использовать бонус +2 силы к этому диску?", `<button class="color-btn" style="background:#2ecc71;" onclick="resolveGeneric(true)">Да (+2)</button>`);
                            if(use) { hPower += 2; disk.innerText = hPower; gameState.players[hTeam].powers[hIndex] += 2; gameState.captainsUsedRound[hTeam] = true; logMsg(`⚓ Ирис применяет способность! (+2)`); await delay(500); }
                        } else {
                            if(hPower < dPower && hPower + 2 >= dPower) { hPower += 2; disk.innerText = hPower; gameState.players[hTeam].powers[hIndex] += 2; gameState.captainsUsedRound[hTeam] = true; logMsg(`🤖 Ирис (${hTeam}) внезапно дает +2 силы!`); await delay(500); }
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
                        
                        if (cap === 'thorvald') { gameState.players[hTeam].powers[hIndex] += 2; logMsg(`❌ Прорыв! Торвальд качает драконьера на +2!`, "log-fail");
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

function nextRound() { 
    if (gameState.round === 5) { calculateFinalScores(); return; } 
    gameState.round++; startRound(); 
}
