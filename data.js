// === ФАЙЛ: data.js ===

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
    botCount: 0,
    captainsUsedRound: { blue: false, red: false, green: false, purple: false }
};

let turnOrder = []; 
let firstPlayerIndex = 0; 
let currentTurnIndex = 0;

const captainsDb = [
    { id: 'corvo', name: '"Адмирал" Корво', desc: 'В фазу засады при размещении диска можно забрать бонус с ДРУГОЙ пустой клетки локации.', phase: 'ambush_passive' },
    { id: 'hector', name: 'Гектор "Свинцовый Шквал"', desc: 'Прокачка: Поймал = +2 силы (макс 8). Не поймал = -1 сила (мин 1).', phase: 'passive' },
    { id: 'iris', name: '"Железная" Ирис', desc: 'Один раз в раунд в фазу прорыва (после вскрытия диска) можно дать ему +2 силы.', phase: 'resolve_active' },
    { id: 'eleonora', name: 'Мадам Элеонора', desc: 'Один раз в раунд в фазу прорыва можно перекрасить пойманного дракона.', phase: 'resolve_active' },
    { id: 'thorvald', name: 'Торвальд "Седая Сталь"', desc: 'Всякий раз, когда драконьер НЕ поймал дракона, его сила растет на +2 (вместо +1).', phase: 'passive' },
    { id: 'bramm', name: 'Брамм "Мёртвый узел"', desc: 'Раз в раунд в засаду: сбросьте 1 дракона, чтобы дать +X силы невыставленному диску.', phase: 'ambush_active' },
    { id: 'sylvia', name: 'Сильвия "Леди Ночь"', desc: 'Старт с силой 2, 3 и 4. Один раз в засаду можно подсмотреть любой скрытый диск.', phase: 'ambush_active' },
    { id: 'quint', name: 'Квинт "Золотой Змей"', desc: 'В засаду: -1 силы диска, чтобы мгновенно выполнить контракт, для которого не хватает 1 карты.', phase: 'ambush_active' }
];

const treasuresDb = [
    { type: 'treasure', name: "Мушкет", short: "👑/4💪", desc: "1 корона за каждые 4 силы команды" },
    { type: 'treasure', name: "Янтарный амулет", short: "👑/🟡", desc: "1 корона за каждый ЖЕЛТЫЙ цвет" },
    { type: 'treasure', name: "Желто-красный", short: "2👑/🟡🔴", desc: "2 короны за пару (Желтый + Красный)" },
    { type: 'treasure', name: "Драконья брошь", short: "2👑/==", desc: "2 очка за пару драконов одинаковой силы" },
    { type: 'treasure', name: "Изумрудный", short: "👑/🟢", desc: "1 корона за каждый ЗЕЛЕНЫЙ цвет" },
    { type: 'treasure', name: "Фиолето-желтый", short: "2👑/🟣🟡", desc: "2 короны за пару (Фиолет + Желтый)" },
    { type: 'treasure', name: "Белое яйцо", short: "🥚/⚪", desc: "Яйцо и сокровище. Можно красить", isEgg: true, color: 'white', isOriginallyWhite: true },
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
    { type: 'treasure', name: "Драконий череп", short: "2👑/3🐉", desc: "2 короны за любых 3 драконов" },
    { type: 'treasure', name: "Рубиновый", short: "👑/🔴", desc: "1 корона за КРАСНЫЙ цвет" },
    { type: 'treasure', name: "Призма", short: "5👑/🌈", desc: "5 корон за набор из 4 разных цветов" },
    { type: 'treasure', name: "Глобус", short: "3-6👑/📜", desc: "3 короны за 2 контракта, 6 корон за 3+" },
    { type: 'treasure', name: "Скарабей", short: "3👑/🚫ЦВЕТ", desc: "3 короны за каждый отсутствующий цвет" },
    { type: 'treasure', name: "Песочные часы", short: "6👑/5🥚", desc: "6 корон за каждые 5 яиц" }
];

let decks = { d1: [], d2: [], eggs: [], treasures: [] };

window.shuffle = function(arr) { 
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    } 
    return arr; 
};

window.initDecks = function() {
    decks = { d1: [], d2: [], eggs: [], treasures: [] }; // Очистка колод
    
    colors.forEach(c => {
        decks.d1.push({type:'dragon', color:c, power:3, crowns:1}, {type:'dragon', color:c, power:3, crowns:1}, {type:'dragon', color:c, power:4, crowns:2}, {type:'dragon', color:c, power:4, crowns:2}, {type:'dragon', color:c, power:5, crowns:3}, {type:'dragon', color:c, power:6, crowns:4});
        decks.d2.push({type:'dragon', color:c, power:5, crowns:3}, {type:'dragon', color:c, power:6, crowns:4}, {type:'dragon', color:c, power:8, crowns:5}, {type:'dragon', color:c, power:10, crowns:6});
    });
    decks.d1.push({type:'dragon', color:'white', power:4, crowns:1}, {type:'dragon', color:'white', power:4, crowns:1}, {type:'dragon', color:'white', power:6, crowns:2});
    decks.d2.push({type:'dragon', color:'white', power:6, crowns:2}, {type:'dragon', color:'white', power:6, crowns:2});
    
    window.shuffle(decks.d1); 
    window.shuffle(decks.d2);
    
    colors.forEach(c => { for(let i=0; i<5; i++) decks.eggs.push({type:'egg', color:c}); });
    window.shuffle(decks.eggs);
    
    decks.treasures = window.shuffle(JSON.parse(JSON.stringify(treasuresDb)));
};
