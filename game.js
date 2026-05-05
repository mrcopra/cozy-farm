'use strict';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const CROPS = {
  turnip:       { name:'Turnip',       emoji:'🌿', seedCost:5,   sellPrice:15,  growTime:30,  unlockAt:0    },
  carrot:       { name:'Carrot',       emoji:'🥕', seedCost:15,  sellPrice:40,  growTime:60,  unlockAt:0    },
  potato:       { name:'Potato',       emoji:'🥔', seedCost:25,  sellPrice:75,  growTime:90,  unlockAt:100  },
  strawberry:   { name:'Strawberry',   emoji:'🍓', seedCost:50,  sellPrice:160, growTime:150, unlockAt:400  },
  corn:         { name:'Corn',         emoji:'🌽', seedCost:40,  sellPrice:130, growTime:120, unlockAt:700  },
  pumpkin:      { name:'Pumpkin',      emoji:'🎃', seedCost:80,  sellPrice:270, growTime:240, unlockAt:1500 },
  blueberry:    { name:'Blueberry',    emoji:'🫐', seedCost:100, sellPrice:350, growTime:300, unlockAt:4000 },
  // craftable hybrids
  golden_turnip:{ name:'Golden Turnip',emoji:'✨', seedCost:0,   sellPrice:55,  growTime:35,  unlockAt:0,    craftable:true },
  sunberry:     { name:'Sunberry',     emoji:'🍊', seedCost:0,   sellPrice:230, growTime:165, unlockAt:400,  craftable:true },
  harvest_moon: { name:'Harvest Moon', emoji:'🌕', seedCost:0,   sellPrice:700, growTime:370, unlockAt:4000, craftable:true },
};

const REGULAR_CROPS = Object.entries(CROPS).filter(([,c]) => !c.craftable).map(([id]) => id);

const RECIPES = [
  { resultId:'golden_turnip', name:'Golden Turnip ✨', ingredients:{ turnip:5 },              yields:3, desc:'5× Turnip → 3 golden seeds' },
  { resultId:'sunberry',      name:'Sunberry 🍊',       ingredients:{ strawberry:2, corn:2 },  yields:2, desc:'2× Strawberry + 2× Corn → 2 seeds' },
  { resultId:'harvest_moon',  name:'Harvest Moon 🌕',   ingredients:{ pumpkin:2, blueberry:2 },yields:1, desc:'2× Pumpkin + 2× Blueberry → 1 seed' },
];

const UPGRADES = [
  { id:'can',         name:'🚿 Watering Can',   desc:'Crops grow 1.5× faster',           cost:150,  req:null          },
  { id:'fertilizer',  name:'🌿 Fertilizer',      desc:'Crops grow 2× faster',             cost:400,  req:'can'         },
  { id:'expansion',   name:'🏗️ Farm Expansion', desc:'Expand farm to 4×4 (16 plots)',    cost:600,  req:null          },
  { id:'autoHarvest', name:'🤖 Auto-Harvester',  desc:'Automatically harvest ripe crops', cost:1500, req:null          },
  { id:'greenhouse',  name:'🏡 Greenhouse',       desc:'Crops grow 3× faster',             cost:3000, req:'fertilizer'  },
];

const WEATHER = {
  sunny:   { name:'Sunny',   emoji:'☀️',  growMult:1.2, qualBonus:0,     body:'weather-sunny'   },
  cloudy:  { name:'Cloudy',  emoji:'⛅',  growMult:1.0, qualBonus:0,     body:'weather-cloudy'  },
  rainy:   { name:'Rainy',   emoji:'🌧️', growMult:1.3, qualBonus:0.05,  body:'weather-rainy'   },
  perfect: { name:'Perfect', emoji:'🌈', growMult:1.5, qualBonus:0.10,  body:'weather-perfect' },
  storm:   { name:'Storm',   emoji:'⛈️', growMult:0.7, qualBonus:-0.05, body:'weather-storm'   },
};
const WKEYS    = Object.keys(WEATHER);
const WWEIGHTS = [30, 25, 25, 10, 10];

const ACHIEVEMENTS = [
  { id:'first_harvest',  name:'Green Thumb',      emoji:'🌱', desc:'Harvest your first crop',          reward:20,   check:s => s.totalHarvested >= 1 },
  { id:'harvest_25',     name:'Bountiful',        emoji:'🌾', desc:'Harvest 25 crops',                 reward:100,  check:s => s.totalHarvested >= 25 },
  { id:'harvest_100',    name:'Prolific',         emoji:'🏆', desc:'Harvest 100 crops',                reward:500,  check:s => s.totalHarvested >= 100 },
  { id:'earn_500',       name:'Coin Collector',   emoji:'💰', desc:'Earn 500 coins total',             reward:50,   check:s => s.totalEarned >= 500 },
  { id:'earn_2000',      name:'Wealthy Farmer',   emoji:'💎', desc:'Earn 2,000 coins total',           reward:200,  check:s => s.totalEarned >= 2000 },
  { id:'earn_10000',     name:'Farm Tycoon',      emoji:'👑', desc:'Earn 10,000 coins total',          reward:1000, check:s => s.totalEarned >= 10000 },
  { id:'buy_upgrade',    name:'Improver',         emoji:'⚙️', desc:'Buy your first upgrade',           reward:30,   check:s => UPGRADES.some(u => s.upgrades[u.id]) },
  { id:'all_upgrades',   name:'Maximizer',        emoji:'🔧', desc:'Own every upgrade',                reward:500,  check:s => UPGRADES.every(u => s.upgrades[u.id]) },
  { id:'full_farm',      name:'Full House',       emoji:'🏡', desc:'Have every plot growing at once',  reward:75,   check:s => s.plots.length > 0 && s.plots.every(p => p.crop) },
  { id:'golden_crop',    name:'Gold Rush',        emoji:'🌟', desc:'Harvest a golden-quality crop',    reward:100,  check:s => s.goldenHarvested >= 1 },
  { id:'quest_1',        name:'Good Neighbor',    emoji:'🤝', desc:'Complete your first quest',        reward:50,   check:s => s.questsCompleted >= 1 },
  { id:'quest_5',        name:'Trusted Neighbor', emoji:'🏅', desc:'Complete 5 quests',                reward:200,  check:s => s.questsCompleted >= 5 },
  { id:'craft_1',        name:'Alchemist',        emoji:'⚗️', desc:'Craft your first hybrid seed',    reward:100,  check:s => s.seedsCrafted >= 1 },
  { id:'all_crops',      name:'Completionist',    emoji:'🌍', desc:'Unlock all 7 base crop types',     reward:500,  check:s => REGULAR_CROPS.every(id => isUnlocked(id)) },
];

// ─── STATE ────────────────────────────────────────────────────────────────────

const state = {
  coins: 50,
  day: 1,
  dayTick: 0,
  plots: [],
  seeds: {},
  bag: {},            // cropId → [normalQty, starQty, goldQty]
  selectedSeed: null,
  upgrades: {},
  totalEarned: 0,
  totalHarvested: 0,
  goldenHarvested: 0,
  seedsCrafted: 0,
  questsCompleted: 0,
  weather: 'sunny',
  nextWeather: 'cloudy',
  marketMults: {},    // cropId → price multiplier
  quests: [],
  earnedAchievements: new Set(),
  announcedUnlocks: new Set(['turnip', 'carrot']),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function newPlot() {
  return { crop:null, plantedAt:null, progress:0, ready:false };
}

function growthMultiplier() {
  let base = 1;
  if (state.upgrades.greenhouse)  base = 3;
  else if (state.upgrades.fertilizer) base = 2;
  else if (state.upgrades.can)    base = 1.5;
  return base * WEATHER[state.weather].growMult;
}

function isUnlocked(cropId) {
  return state.totalEarned >= CROPS[cropId].unlockAt;
}

function bagQty(cropId) {
  const b = state.bag[cropId];
  return b ? b[0] + b[1] + b[2] : 0;
}

function bagValue(cropId) {
  const b = state.bag[cropId];
  if (!b) return 0;
  const base = Math.round(CROPS[cropId].sellPrice * (state.marketMults[cropId] || 1));
  return b[0]*base + b[1]*Math.round(base*1.5) + b[2]*(base*2);
}

function rollQuality() {
  const w = WEATHER[state.weather];
  const greenhouse = state.upgrades.greenhouse;
  const fertilizer = state.upgrades.fertilizer;
  const goldChance = Math.max(0, 0.03 + (greenhouse ? 0.07 : 0) + w.qualBonus);
  const starChance = Math.max(0, 0.10 + (greenhouse ? 0.10 : fertilizer ? 0.05 : 0) + w.qualBonus);
  const r = Math.random();
  if (r < goldChance) return 2;
  if (r < goldChance + starChance) return 1;
  return 0;
}

function randomWeather() {
  const total = WWEIGHTS.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < WKEYS.length; i++) {
    r -= WWEIGHTS[i];
    if (r <= 0) return WKEYS[i];
  }
  return WKEYS[0];
}

function genMarket() {
  const m = {};
  REGULAR_CROPS.forEach(id => {
    const r = Math.random();
    m[id] = r < .05 ? 1.6 : r < .15 ? 1.4 : r < .35 ? 1.2 : r < .65 ? 1.0 : r < .80 ? 0.9 : 0.75;
  });
  return m;
}

function genQuests() {
  const avail = REGULAR_CROPS.filter(id => isUnlocked(id));
  if (!avail.length) return [];
  const pool = [...avail].sort(() => Math.random() - .5);
  return pool.slice(0, Math.min(3, pool.length)).map(cropId => {
    const qty    = Math.floor(Math.random() * 4) + 2;
    const reward = Math.round(CROPS[cropId].sellPrice * qty * 1.6);
    return { cropId, qty, reward, done: false };
  });
}

function consumeFromBag(cropId, qty) {
  if (!state.bag[cropId]) return;
  let rem = qty;
  const b = state.bag[cropId];
  for (let q = 0; q <= 2 && rem > 0; q++) {
    const take = Math.min(b[q], rem);
    b[q] -= take; rem -= take;
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  UPGRADES.forEach(u => { state.upgrades[u.id] = false; });

  if (!loadGame()) {
    for (let i = 0; i < 9; i++) state.plots.push(newPlot());
    state.seeds.turnip = 5;
    state.seeds.carrot = 3;
    state.selectedSeed = 'turnip';
    state.weather = 'sunny';
    state.nextWeather = randomWeather();
    state.marketMults = genMarket();
    state.quests = genQuests();
  } else {
    recalculatePlots();
  }

  applyBodyClasses();
  bindEvents();
  startParticles();
  render();
  setInterval(tick, 1000);
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────

function tick() {
  state.dayTick++;
  if (state.dayTick >= 120) {
    state.dayTick = 0;
    state.day++;
    state.weather    = state.nextWeather;
    state.nextWeather = randomWeather();
    state.marketMults = genMarket();
    state.quests = genQuests();
    applyBodyClasses();
    const w = WEATHER[state.weather];
    toast(`🌅 Day ${state.day}! ${w.emoji} ${w.name} (${w.growMult >= 1 ? '+' : ''}${Math.round((w.growMult-1)*100)}% growth)`, 'info');
    render();
    saveGame();
    return;
  }

  applyBodyClasses(); // update time-of-day class each tick

  const mult = growthMultiplier();
  const now  = Date.now();
  let autoHarvested = 0;

  state.plots.forEach((plot, i) => {
    if (!plot.crop || plot.ready) return;
    const elapsed  = (now - plot.plantedAt) / 1000;
    const growTime = CROPS[plot.crop].growTime / mult;
    plot.progress  = Math.min(100, (elapsed / growTime) * 100);
    if (plot.progress >= 100) {
      plot.ready = true;
      if (plot.quality === undefined) plot.quality = rollQuality();
      if (state.upgrades.autoHarvest) { doHarvest(i); autoHarvested++; }
    }
  });

  if (autoHarvested > 0) {
    toast(`🤖 Auto-harvested ${autoHarvested} crop${autoHarvested > 1 ? 's' : ''}!`, 'info');
    render();
  } else {
    renderHeader();
    renderFarm();
  }

  saveGame();
}

function recalculatePlots() {
  const now  = Date.now();
  const mult = growthMultiplier();
  state.plots.forEach(plot => {
    if (!plot.crop || plot.ready) return;
    const elapsed  = (now - plot.plantedAt) / 1000;
    const growTime = CROPS[plot.crop].growTime / mult;
    plot.progress  = Math.min(100, (elapsed / growTime) * 100);
    if (plot.progress >= 100) {
      plot.ready = true;
      if (plot.quality === undefined) plot.quality = rollQuality();
    }
  });
}

function applyBodyClasses() {
  const t = state.dayTick;
  const timeClass = t < 30 ? 'time-dawn' : t < 60 ? 'time-day' : t < 90 ? 'time-dusk' : 'time-night';
  document.body.className = `${WEATHER[state.weather].body} ${timeClass}`;
}

// ─── ACTIONS ──────────────────────────────────────────────────────────────────

function clickPlot(i) {
  const plot = state.plots[i];
  if (plot.ready) {
    const { name, emoji } = CROPS[plot.crop];
    const qi = doHarvest(i);
    const ql = ['', ' ⭐', ' 🌟'][qi];
    spawnHarvestEffect(i, qi);
    toast(`${emoji} ${name}${ql} harvested!`, qi === 2 ? 'gold' : 'info');
    checkAchievements();
    render(); saveGame();
  } else if (!plot.crop) {
    doPlant(i);
  }
}

function doPlant(i) {
  const seed = state.selectedSeed;
  if (!seed) { toast('Select a seed first — visit the Store!', 'warn'); return; }
  if (!state.seeds[seed] || state.seeds[seed] <= 0) {
    toast('No seeds left! Buy more in the Store.', 'warn');
    state.selectedSeed = null; render(); return;
  }
  state.plots[i] = { crop:seed, plantedAt:Date.now(), progress:0, ready:false };
  state.seeds[seed]--;
  checkAchievements();
  render();
  spawnPlantEffect(i); // after render so the class isn't wiped immediately
  saveGame();
}

function doHarvest(i) {
  const plot = state.plots[i];
  const crop = plot.crop;
  const qi   = plot.quality ?? rollQuality();
  if (!state.bag[crop]) state.bag[crop] = [0,0,0];
  state.bag[crop][qi]++;
  state.totalHarvested++;
  if (qi === 2) state.goldenHarvested++;
  state.plots[i] = newPlot();
  return qi;
}

function sellAll() {
  let total = 0, count = 0;
  Object.entries(state.bag).forEach(([id, b]) => {
    const qty = b[0]+b[1]+b[2];
    if (!qty) return;
    total += bagValue(id); count += qty;
    state.bag[id] = [0,0,0];
  });
  if (!count) { toast('Nothing to sell! Harvest first.', 'warn'); return; }
  state.coins     += total;
  state.totalEarned += total;
  spawnCoinPop(total);
  toast(`💰 Sold ${count} crop${count>1?'s':''} for ${total} coins!`, 'gold');
  checkUnlocks(); checkAchievements();
  render(); saveGame();
}

function buySeeds(cropId, qty) {
  const crop = CROPS[cropId];
  const cost = crop.seedCost * qty;
  if (state.coins < cost) { toast(`Need ${cost} coins! You have ${state.coins}.`, 'warn'); return; }
  state.coins -= cost;
  state.seeds[cropId] = (state.seeds[cropId] || 0) + qty;
  if (!state.selectedSeed) state.selectedSeed = cropId;
  toast(`🛒 Bought ${qty}× ${crop.name} seeds!`, 'info');
  render(); saveGame();
}

function selectSeed(cropId) {
  if (!state.seeds[cropId] || state.seeds[cropId] <= 0) { toast('Buy seeds first!', 'warn'); return; }
  state.selectedSeed = cropId; render();
}

function clearSeed() { state.selectedSeed = null; render(); }

function buyUpgrade(upgradeId) {
  const upg = UPGRADES.find(u => u.id === upgradeId);
  if (!upg || state.upgrades[upgradeId]) return;
  if (upg.req && !state.upgrades[upg.req]) {
    toast(`Requires: ${UPGRADES.find(u => u.id === upg.req).name}`, 'warn'); return;
  }
  if (state.coins < upg.cost) { toast(`Need ${upg.cost} coins! You have ${state.coins}.`, 'warn'); return; }
  state.coins -= upg.cost;
  state.upgrades[upgradeId] = true;
  if (upgradeId === 'expansion') while (state.plots.length < 16) state.plots.push(newPlot());
  toast(`✅ ${upg.name} purchased!`, 'info');
  checkAchievements(); render(); saveGame();
}

function craftRecipe(idx) {
  const recipe = RECIPES[idx];
  for (const [ing, needed] of Object.entries(recipe.ingredients)) {
    if (bagQty(ing) < needed) {
      toast(`Need ${needed}× ${CROPS[ing].name} in your bag!`, 'warn'); return;
    }
  }
  for (const [ing, needed] of Object.entries(recipe.ingredients)) consumeFromBag(ing, needed);
  state.seeds[recipe.resultId] = (state.seeds[recipe.resultId] || 0) + recipe.yields;
  state.selectedSeed = recipe.resultId;
  state.seedsCrafted++;
  toast(`⚗️ Crafted ${recipe.yields}× ${CROPS[recipe.resultId].name} seeds!`, 'success');
  checkAchievements(); render(); saveGame();
}

function fulfillQuest(idx) {
  const quest = state.quests[idx];
  if (quest.done) return;
  if (bagQty(quest.cropId) < quest.qty) {
    toast(`Need ${quest.qty}× ${CROPS[quest.cropId].name} in your bag!`, 'warn'); return;
  }
  consumeFromBag(quest.cropId, quest.qty);
  state.coins       += quest.reward;
  state.totalEarned += quest.reward;
  quest.done = true;
  state.questsCompleted++;
  spawnCoinPop(quest.reward);
  toast(`🤝 Quest complete! +${quest.reward} coins!`, 'gold');
  checkUnlocks(); checkAchievements(); render(); saveGame();
}

function checkUnlocks() {
  Object.entries(CROPS).forEach(([id, crop]) => {
    if (!state.announcedUnlocks.has(id) && isUnlocked(id)) {
      state.announcedUnlocks.add(id);
      setTimeout(() => toast(`🎉 Unlocked: ${crop.emoji} ${crop.name}!`, 'success'), 600);
    }
  });
}

function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (!state.earnedAchievements.has(ach.id) && ach.check(state)) {
      state.earnedAchievements.add(ach.id);
      state.coins += ach.reward;
      showAchievementPopup(ach);
    }
  });
}

// ─── SAVE / LOAD ──────────────────────────────────────────────────────────────

function saveGame() {
  try {
    localStorage.setItem('cozyfarm_v2', JSON.stringify({
      ...state,
      earnedAchievements: [...state.earnedAchievements],
      announcedUnlocks:   [...state.announcedUnlocks],
    }));
  } catch(_) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem('cozyfarm_v2');
    if (!raw) return false;
    const d = JSON.parse(raw);
    d.earnedAchievements = new Set(d.earnedAchievements || []);
    d.announcedUnlocks   = new Set(d.announcedUnlocks   || ['turnip','carrot']);
    UPGRADES.forEach(u => { if (d.upgrades[u.id] === undefined) d.upgrades[u.id] = false; });
    // migrate old bag format
    if (d.bag) Object.keys(d.bag).forEach(id => {
      if (typeof d.bag[id] === 'number') d.bag[id] = [d.bag[id], 0, 0];
    });
    if (!d.marketMults) d.marketMults = genMarket();
    if (!d.quests)      d.quests      = [];
    Object.assign(state, d);
    return true;
  } catch(_) { return false; }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function render() {
  renderHeader(); renderFarm(); renderStore(); renderBag(); renderGoals();
}

function renderHeader() {
  el('stat-coins').textContent = state.coins;
  el('stat-day').textContent   = state.day;
  const t = state.dayTick;
  el('stat-time').textContent  = t < 30 ? '🌅 Dawn' : t < 60 ? '☀️ Day' : t < 90 ? '🌇 Dusk' : '🌙 Night';

  const w  = WEATHER[state.weather];
  const nw = WEATHER[state.nextWeather];
  el('weather-current').textContent = `${w.emoji} ${w.name}`;
  el('weather-mult').textContent    = w.growMult !== 1
    ? `${w.growMult > 1 ? '+' : ''}${Math.round((w.growMult-1)*100)}% growth`
    : '';
  el('weather-next').textContent    = `Tomorrow: ${nw.emoji} ${nw.name}`;

  const cnt = state.selectedSeed ? (state.seeds[state.selectedSeed] || 0) : 0;
  el('holding-label').textContent = state.selectedSeed
    ? `${CROPS[state.selectedSeed].emoji} ${CROPS[state.selectedSeed].name} Seeds (${cnt} left)`
    : 'Holding: Nothing';
  el('btn-clear-seed').style.display = state.selectedSeed ? 'inline-flex' : 'none';
}

function getFarmHint() {
  const ready   = state.plots.filter(p => p.ready).length;
  const growing = state.plots.filter(p => p.crop && !p.ready).length;
  const empty   = state.plots.filter(p => !p.crop).length;
  if (ready)   return `✨ ${ready} crop${ready>1?'s are':' is'} ready — click to harvest!`;
  if (!state.selectedSeed) return '🏪 Visit the Store to buy and select seeds.';
  const have = state.seeds[state.selectedSeed] || 0;
  if (empty && have)  return `🌱 Click empty plots to plant ${CROPS[state.selectedSeed].emoji} ${CROPS[state.selectedSeed].name}!`;
  if (empty && !have) return 'Out of seeds! Buy more in the Store.';
  if (growing)        return '🌿 Crops are growing… sit back and relax!';
  return '';
}

function renderFarm() {
  const grid = el('farm-grid');
  const cols = state.upgrades.expansion ? 4 : 3;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  if (grid.children.length !== state.plots.length) grid.innerHTML = '';

  state.plots.forEach((plot, i) => {
    let div = grid.children[i];
    if (!div) {
      div = document.createElement('div');
      div.addEventListener('click', () => clickPlot(i));
      grid.appendChild(div);
    }

    div.className = 'plot';
    if (plot.ready) {
      const c = CROPS[plot.crop];
      div.classList.add('plot-ready');
      if (plot.quality === 2) div.classList.add('golden-ready');
      div.innerHTML = `<div class="plot-emoji">${c.emoji}</div><div class="plot-label">Ready!</div>`;
    } else if (plot.crop) {
      const c   = CROPS[plot.crop];
      const pct = Math.floor(plot.progress);
      const grow = pct >= 66 ? c.emoji : pct >= 33 ? '🌿' : '🌱';
      const barColor = pct >= 80 ? '#f9a825' : '#4a7c4e';
      div.classList.add('plot-growing');
      div.innerHTML = `
        <div class="plot-emoji">${grow}</div>
        <div class="plot-bar"><div class="plot-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
        <div class="plot-label">${pct}%</div>`;
    } else {
      div.classList.add('plot-empty');
      if (state.selectedSeed) div.classList.add('plot-plantable');
      div.innerHTML = `<div class="plot-emoji">🟫</div>`;
    }
  });

  el('farm-hint').textContent = getFarmHint();
}

function renderStore() {
  // Market status
  const hot = Object.entries(state.marketMults)
    .filter(([,m]) => m >= 1.4)
    .map(([id,m]) => `${CROPS[id].emoji} ${CROPS[id].name} ×${m.toFixed(1)}`);
  el('market-status').innerHTML = hot.length
    ? `<span class="market-hot">📈 Hot today: ${hot.join(' · ')}</span>`
    : `<span class="market-normal">📊 Stable market today</span>`;

  // Seeds
  const seedEl = el('seed-shop');
  seedEl.innerHTML = '';
  REGULAR_CROPS.forEach(id => {
    const crop    = CROPS[id];
    const unlocked = isUnlocked(id);
    const card    = document.createElement('div');
    card.className = `seed-card${unlocked ? '' : ' locked'}`;
    const owned   = state.seeds[id] || 0;
    const isSel   = state.selectedSeed === id;
    const mMult   = state.marketMults[id] || 1;
    const mPrice  = Math.round(crop.sellPrice * mMult);
    const mClass  = mMult >= 1.4 ? 'price-hot' : mMult <= 0.8 ? 'price-low' : '';

    if (!unlocked) {
      card.innerHTML = `
        <div class="seed-emoji">🔒</div>
        <div class="seed-name">${crop.name}</div>
        <div class="seed-unlock">Earn ${crop.unlockAt - state.totalEarned} more coins</div>`;
    } else {
      card.innerHTML = `
        <div class="seed-emoji">${crop.emoji}</div>
        <div class="seed-name">${crop.name}</div>
        <div class="seed-info"><span>🌱 ${crop.seedCost}💰</span><span class="${mClass}">🛒 ${mPrice}💰${mMult>=1.4?' 📈':mMult<=0.8?' 📉':''}</span></div>
        <div class="seed-info"><span>⏱️ ${crop.growTime}s</span><span>📦 ${owned}</span></div>
        <div class="seed-btns">
          <button onclick="buySeeds('${id}',1)" ${state.coins<crop.seedCost?'disabled':''}>Buy 1</button>
          <button onclick="buySeeds('${id}',5)" ${state.coins<crop.seedCost*5?'disabled':''}>×5</button>
        </div>
        ${owned > 0 ? `<button class="select-btn${isSel?' selected':''}" onclick="selectSeed('${id}')">${isSel?'✓ Selected':'Equip'}</button>` : ''}`;
    }
    seedEl.appendChild(card);
  });

  // Upgrades
  const upgEl = el('upgrade-shop');
  upgEl.innerHTML = '';
  UPGRADES.forEach(upg => {
    const owned    = state.upgrades[upg.id];
    const afford   = state.coins >= upg.cost;
    const reqMet   = !upg.req || state.upgrades[upg.req];
    const card     = document.createElement('div');
    card.className = `upg-card${owned?' upg-owned':''}${!reqMet?' locked':''}`;
    let action;
    if (owned)       action = '<span class="upg-badge">✅ Owned</span>';
    else if (!reqMet) action = `<span class="upg-lock">Requires ${UPGRADES.find(u=>u.id===upg.req)?.name}</span>`;
    else             action = `<button onclick="buyUpgrade('${upg.id}')" class="${afford?'':'cant-afford'}">${upg.cost}💰</button>`;
    card.innerHTML = `
      <div class="upg-info"><div class="upg-name">${upg.name}</div><div class="upg-desc">${upg.desc}</div></div>
      <div class="upg-action">${action}</div>`;
    upgEl.appendChild(card);
  });
  el('stat-speed').textContent = `${growthMultiplier().toFixed(1)}×`;

  // Crafting
  const craftEl = el('craft-shop');
  craftEl.innerHTML = '';
  RECIPES.forEach((recipe, idx) => {
    const result      = CROPS[recipe.resultId];
    const canUnlock   = Object.keys(recipe.ingredients).every(id => isUnlocked(id));
    const canCraft    = canUnlock && Object.entries(recipe.ingredients).every(([id,n]) => bagQty(id) >= n);
    const card        = document.createElement('div');
    card.className    = `craft-card${canUnlock ? '' : ' locked'}`;
    const ingList     = Object.entries(recipe.ingredients)
      .map(([id,n]) => `${CROPS[id].emoji}×${n} <span style="opacity:.6">(have:${bagQty(id)})</span>`)
      .join(' + ');
    card.innerHTML = `
      <div class="craft-result">${result.emoji}</div>
      <div class="craft-info">
        <div class="craft-name">${recipe.name}</div>
        <div class="craft-desc">${recipe.desc}</div>
        <div class="craft-ing">${ingList}</div>
      </div>
      ${canUnlock
        ? `<button onclick="craftRecipe(${idx})" class="${canCraft?'':'cant-afford'}">Craft</button>`
        : '<span class="upg-lock">Unlock ingredients first</span>'}`;
    craftEl.appendChild(card);
  });
}

function renderBag() {
  const bagEl  = el('bag-contents');
  const items  = Object.entries(state.bag).filter(([,b]) => b[0]+b[1]+b[2] > 0);
  el('stat-total-earned').textContent   = state.totalEarned;
  el('stat-total-harvested').textContent = state.totalHarvested;
  el('stat-quests').textContent          = state.questsCompleted;
  el('stat-golden').textContent          = state.goldenHarvested;

  if (!items.length) {
    bagEl.innerHTML = '<p class="empty-msg">Your bag is empty.<br>Harvest crops to fill it!</p>';
    return;
  }

  let total = 0;
  bagEl.innerHTML = items.map(([id, b]) => {
    const qty  = b[0]+b[1]+b[2];
    const val  = bagValue(id);
    total += val;
    const parts = [];
    if (b[0]) parts.push(`${b[0]} normal`);
    if (b[1]) parts.push(`${b[1]} ⭐`);
    if (b[2]) parts.push(`${b[2]} 🌟`);
    return `<div class="bag-item">
      <span class="bag-emoji">${CROPS[id].emoji}</span>
      <div class="bag-info">
        <span class="bag-name">${CROPS[id].name}</span>
        <span class="bag-qual">${parts.join(' · ')}</span>
      </div>
      <span class="bag-qty">×${qty}</span>
      <span class="bag-val">${val}💰</span>
    </div>`;
  }).join('');

  bagEl.innerHTML += `<div class="bag-total">
    <span>Total: ${total}💰</span>
    <button class="gold-btn" onclick="sellAll()">Sell All</button>
  </div>`;
}

function renderGoals() {
  // Quests
  const questEl = el('quest-list');
  questEl.innerHTML = '';
  if (!state.quests.length) {
    questEl.innerHTML = '<p class="empty-msg" style="padding:14px">Quests refresh each new day!</p>';
  } else {
    state.quests.forEach((quest, idx) => {
      const crop = CROPS[quest.cropId];
      const have = bagQty(quest.cropId);
      const canFulfill = !quest.done && have >= quest.qty;
      const card = document.createElement('div');
      card.className = `quest-card${quest.done ? ' quest-done' : ''}`;
      card.innerHTML = `
        <div class="quest-crop">${crop.emoji}</div>
        <div class="quest-info">
          <div class="quest-desc">Deliver <strong>${quest.qty}× ${crop.name}</strong></div>
          <div class="quest-have">In bag: ${have} / ${quest.qty}</div>
        </div>
        <div class="quest-action">
          ${quest.done
            ? '<span class="quest-done-badge">✅ Done</span>'
            : `<button onclick="fulfillQuest(${idx})" class="${canFulfill?'gold-btn':'cant-afford'}" ${canFulfill?'':'disabled'}>+${quest.reward}💰</button>`}
        </div>`;
      questEl.appendChild(card);
    });
  }

  // Achievements
  const achEl = el('achievement-list');
  achEl.innerHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const earned = state.earnedAchievements.has(ach.id);
    const card   = document.createElement('div');
    card.className = `ach-card${earned ? ' ach-earned' : ''}`;
    card.innerHTML = `
      <div class="ach-emoji">${ach.emoji}</div>
      <div class="ach-info">
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
      </div>
      <div class="ach-reward">${earned ? '✅' : `+${ach.reward}💰`}</div>`;
    achEl.appendChild(card);
  });
}

// ─── VISUAL EFFECTS ───────────────────────────────────────────────────────────

function spawnHarvestEffect(plotIdx, qi) {
  const grid = el('farm-grid');
  const div  = grid.children[plotIdx];
  if (!div) return;
  const rect = div.getBoundingClientRect();
  const cx   = rect.left + rect.width  / 2;
  const cy   = rect.top  + rect.height / 2;
  const count  = qi === 2 ? 10 : qi === 1 ? 6 : 4;
  const emojis = qi === 2 ? ['🌟','✨','💛','⭐'] : qi === 1 ? ['⭐','✨','💫'] : ['✨','🍃','💚'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className   = 'sparkle';
    s.textContent = emojis[i % emojis.length];
    const angle   = (i / count) * Math.PI * 2;
    const dist    = 50 + Math.random() * 60;
    s.style.left = cx + 'px';
    s.style.top  = cy + 'px';
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', (Math.sin(angle) * dist - 60) + 'px');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }
}

function spawnPlantEffect(plotIdx) {
  const grid = el('farm-grid');
  const div  = grid.children[plotIdx];
  if (!div) return;
  div.classList.add('plot-planted');
  setTimeout(() => div.classList.remove('plot-planted'), 400);
}

function spawnCoinPop(amount) {
  const pop = document.createElement('div');
  pop.className   = 'coin-pop';
  pop.textContent = `+${amount}💰`;
  pop.style.left  = (35 + Math.random() * 30) + '%';
  pop.style.top   = '80px';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 1500);
}

function showAchievementPopup(ach) {
  const popup = el('achievement-popup');
  popup.innerHTML = `<div class="ach-popup-inner">
    <div class="ach-popup-emoji">${ach.emoji}</div>
    <div>
      <div class="ach-popup-title">Achievement Unlocked!</div>
      <div class="ach-popup-name">${ach.name}</div>
      <div class="ach-popup-reward">+${ach.reward}💰 reward</div>
    </div>
  </div>`;
  popup.classList.add('show');
  setTimeout(() => popup.classList.remove('show'), 3500);
}

function startParticles() {
  setInterval(() => {
    if (Math.random() > 0.55) return;
    const isNight = state.dayTick >= 90;
    const isRain  = state.weather === 'rainy' || state.weather === 'storm';
    const p = document.createElement('div');

    if (isNight) {
      p.className   = 'particle particle-firefly';
      p.textContent = '✨';
      p.style.left  = (Math.random() * 90 + 5) + 'vw';
      p.style.top   = (Math.random() * 80 + 10) + 'vh';
      p.style.animationDuration = (4 + Math.random() * 5) + 's';
    } else if (isRain) {
      p.className = 'particle particle-rain';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.animationDuration = (.3 + Math.random() * .4) + 's';
    } else {
      p.className   = 'particle particle-leaf';
      p.textContent = ['🍃','🌿','🍂','🌱'][Math.floor(Math.random()*4)];
      p.style.left  = Math.random() * 100 + 'vw';
      p.style.animationDuration = (6 + Math.random() * 8) + 's';
    }

    el('particle-container').appendChild(p);
    setTimeout(() => p.remove(), 14000);
  }, 1600);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

let toastTimer;
function toast(msg, type = 'info') {
  const t = el('toast');
  t.textContent = msg;
  t.className   = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      el(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
  el('btn-sell-all').addEventListener('click', sellAll);
  el('btn-clear-seed').addEventListener('click', clearSeed);
}

document.addEventListener('DOMContentLoaded', init);
