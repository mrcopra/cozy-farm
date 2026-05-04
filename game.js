'use strict';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const CROPS = {
  turnip:     { name: 'Turnip',     emoji: '🌿', seedCost: 5,   sellPrice: 15,  growTime: 30,  unlockAt: 0    },
  carrot:     { name: 'Carrot',     emoji: '🥕', seedCost: 15,  sellPrice: 40,  growTime: 60,  unlockAt: 0    },
  potato:     { name: 'Potato',     emoji: '🥔', seedCost: 25,  sellPrice: 75,  growTime: 90,  unlockAt: 100  },
  strawberry: { name: 'Strawberry', emoji: '🍓', seedCost: 50,  sellPrice: 160, growTime: 150, unlockAt: 400  },
  corn:       { name: 'Corn',       emoji: '🌽', seedCost: 40,  sellPrice: 130, growTime: 120, unlockAt: 700  },
  pumpkin:    { name: 'Pumpkin',    emoji: '🎃', seedCost: 80,  sellPrice: 270, growTime: 240, unlockAt: 1500 },
  blueberry:  { name: 'Blueberry',  emoji: '🫐', seedCost: 100, sellPrice: 350, growTime: 300, unlockAt: 4000 },
};

const UPGRADES = [
  { id: 'can',         name: '🚿 Watering Can',  desc: 'Crops grow 1.5× faster',          cost: 150,  req: null         },
  { id: 'fertilizer',  name: '🌿 Fertilizer',     desc: 'Crops grow 2× faster',            cost: 400,  req: 'can'        },
  { id: 'expansion',   name: '🏗️ Farm Expansion', desc: 'Expand farm to 4×4 (16 plots)',   cost: 600,  req: null         },
  { id: 'autoHarvest', name: '🤖 Auto-Harvester', desc: 'Automatically harvest ripe crops', cost: 1500, req: null         },
  { id: 'greenhouse',  name: '🏡 Greenhouse',      desc: 'Crops grow 3× faster',            cost: 3000, req: 'fertilizer' },
];

// ─── STATE ────────────────────────────────────────────────────────────────────

const state = {
  coins: 50,
  day: 1,
  dayTick: 0,           // 0–119; full day = 120 real seconds
  plots: [],
  seeds: {},            // cropId → count
  bag: {},              // cropId → count (harvested, unsold)
  selectedSeed: null,
  upgrades: {},         // upgradeId → boolean
  totalEarned: 0,
  totalHarvested: 0,
  announcedUnlocks: new Set(['turnip', 'carrot']),
};

// ─── INIT ─────────────────────────────────────────────────────────────────────

function newPlot() {
  return { crop: null, plantedAt: null, progress: 0, ready: false };
}

function init() {
  UPGRADES.forEach(u => { state.upgrades[u.id] = false; });

  if (!loadGame()) {
    for (let i = 0; i < 9; i++) state.plots.push(newPlot());
    state.seeds.turnip = 5;
    state.seeds.carrot = 3;
    state.selectedSeed = 'turnip';
  } else {
    recalculatePlots();
  }

  bindEvents();
  render();
  setInterval(tick, 1000);
}

// ─── GAME LOOP ────────────────────────────────────────────────────────────────

function tick() {
  state.dayTick++;
  if (state.dayTick >= 120) {
    state.dayTick = 0;
    state.day++;
    toast(`🌅 Day ${state.day} has begun!`, 'info');
  }

  const mult = growthMultiplier();
  const now = Date.now();
  let autoHarvested = 0;

  state.plots.forEach((plot, i) => {
    if (!plot.crop || plot.ready) return;
    const elapsed = (now - plot.plantedAt) / 1000;
    const growTime = CROPS[plot.crop].growTime / mult;
    plot.progress = Math.min(100, (elapsed / growTime) * 100);
    if (plot.progress >= 100) {
      plot.ready = true;
      if (state.upgrades.autoHarvest) {
        doHarvest(i);
        autoHarvested++;
      }
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

function growthMultiplier() {
  if (state.upgrades.greenhouse) return 3;
  if (state.upgrades.fertilizer) return 2;
  if (state.upgrades.can) return 1.5;
  return 1;
}

function recalculatePlots() {
  const now = Date.now();
  const mult = growthMultiplier();
  state.plots.forEach(plot => {
    if (!plot.crop || plot.ready) return;
    const elapsed = (now - plot.plantedAt) / 1000;
    const growTime = CROPS[plot.crop].growTime / mult;
    plot.progress = Math.min(100, (elapsed / growTime) * 100);
    if (plot.progress >= 100) plot.ready = true;
  });
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

function clickPlot(i) {
  const plot = state.plots[i];
  if (plot.ready) {
    const cropName = CROPS[plot.crop].name;
    const cropEmoji = CROPS[plot.crop].emoji;
    doHarvest(i);
    toast(`${cropEmoji} Harvested ${cropName}!`, 'info');
    render();
    saveGame();
  } else if (!plot.crop) {
    doPlant(i);
  }
}

function doPlant(i) {
  const seed = state.selectedSeed;
  if (!seed) {
    toast('Select a seed first — visit the Store!', 'warn');
    return;
  }
  if (!state.seeds[seed] || state.seeds[seed] <= 0) {
    toast('No seeds left! Buy more from the Store.', 'warn');
    state.selectedSeed = null;
    render();
    return;
  }
  state.plots[i] = { crop: seed, plantedAt: Date.now(), progress: 0, ready: false };
  state.seeds[seed]--;
  render();
  saveGame();
}

function doHarvest(i) {
  const crop = state.plots[i].crop;
  state.bag[crop] = (state.bag[crop] || 0) + 1;
  state.totalHarvested++;
  state.plots[i] = newPlot();
}

function sellAll() {
  let total = 0, count = 0;
  Object.entries(state.bag).forEach(([id, qty]) => {
    if (qty <= 0) return;
    total += CROPS[id].sellPrice * qty;
    count += qty;
    state.bag[id] = 0;
  });
  if (count === 0) {
    toast('Nothing to sell! Harvest some crops first.', 'warn');
    return;
  }
  state.coins += total;
  state.totalEarned += total;
  toast(`💰 Sold ${count} crop${count > 1 ? 's' : ''} for ${total} coins!`, 'gold');
  checkUnlocks();
  render();
  saveGame();
}

function buySeeds(cropId, qty) {
  const crop = CROPS[cropId];
  const cost = crop.seedCost * qty;
  if (state.coins < cost) {
    toast(`Need ${cost} coins! You have ${state.coins}.`, 'warn');
    return;
  }
  state.coins -= cost;
  state.seeds[cropId] = (state.seeds[cropId] || 0) + qty;
  if (!state.selectedSeed) state.selectedSeed = cropId;
  toast(`🛒 Bought ${qty}× ${crop.name} seeds!`, 'info');
  render();
  saveGame();
}

function selectSeed(cropId) {
  if (!state.seeds[cropId] || state.seeds[cropId] <= 0) {
    toast('Buy seeds first!', 'warn');
    return;
  }
  state.selectedSeed = cropId;
  render();
}

function clearSeed() {
  state.selectedSeed = null;
  render();
}

function buyUpgrade(upgradeId) {
  const upg = UPGRADES.find(u => u.id === upgradeId);
  if (!upg || state.upgrades[upgradeId]) return;
  if (upg.req && !state.upgrades[upg.req]) {
    const req = UPGRADES.find(u => u.id === upg.req);
    toast(`Requires: ${req.name}`, 'warn');
    return;
  }
  if (state.coins < upg.cost) {
    toast(`Need ${upg.cost} coins! You have ${state.coins}.`, 'warn');
    return;
  }
  state.coins -= upg.cost;
  state.upgrades[upgradeId] = true;
  if (upgradeId === 'expansion') {
    while (state.plots.length < 16) state.plots.push(newPlot());
  }
  toast(`✅ ${upg.name} purchased!`, 'info');
  render();
  saveGame();
}

function checkUnlocks() {
  Object.entries(CROPS).forEach(([id, crop]) => {
    if (!state.announcedUnlocks.has(id) && state.totalEarned >= crop.unlockAt) {
      state.announcedUnlocks.add(id);
      setTimeout(() => toast(`🎉 Unlocked: ${crop.emoji} ${crop.name}!`, 'success'), 500);
    }
  });
}

function isUnlocked(cropId) {
  return state.totalEarned >= CROPS[cropId].unlockAt;
}

// ─── SAVE / LOAD ──────────────────────────────────────────────────────────────

function saveGame() {
  try {
    const data = { ...state, announcedUnlocks: [...state.announcedUnlocks] };
    localStorage.setItem('cozyfarm_v1', JSON.stringify(data));
  } catch (_) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem('cozyfarm_v1');
    if (!raw) return false;
    const loaded = JSON.parse(raw);
    loaded.announcedUnlocks = new Set(loaded.announcedUnlocks || ['turnip', 'carrot']);
    UPGRADES.forEach(u => { if (loaded.upgrades[u.id] === undefined) loaded.upgrades[u.id] = false; });
    Object.assign(state, loaded);
    return true;
  } catch (_) {
    return false;
  }
}

// ─── RENDER ───────────────────────────────────────────────────────────────────

function render() {
  renderHeader();
  renderFarm();
  renderStore();
  renderBag();
}

function renderHeader() {
  el('stat-coins').textContent = state.coins;
  el('stat-day').textContent = state.day;
  const t = state.dayTick;
  el('stat-time').textContent = t < 30 ? '🌅 Dawn' : t < 60 ? '☀️ Day' : t < 90 ? '🌇 Dusk' : '🌙 Night';

  const cnt = state.selectedSeed ? (state.seeds[state.selectedSeed] || 0) : 0;
  el('holding-label').textContent = state.selectedSeed
    ? `${CROPS[state.selectedSeed].emoji} ${CROPS[state.selectedSeed].name} Seeds (${cnt} left)`
    : 'Holding: Nothing';
  el('btn-clear-seed').style.display = state.selectedSeed ? 'inline-flex' : 'none';
}

function getFarmHint() {
  const readyCount   = state.plots.filter(p => p.ready).length;
  const growingCount = state.plots.filter(p => p.crop && !p.ready).length;
  const emptyCount   = state.plots.filter(p => !p.crop).length;

  if (readyCount > 0)
    return `✨ ${readyCount} crop${readyCount > 1 ? 's are' : ' is'} ready — click to harvest!`;
  if (!state.selectedSeed)
    return '🏪 Visit the Store to buy and select seeds.';
  const seedCount = state.seeds[state.selectedSeed] || 0;
  if (emptyCount > 0 && seedCount > 0)
    return `Click an empty plot to plant ${CROPS[state.selectedSeed].emoji} ${CROPS[state.selectedSeed].name}!`;
  if (emptyCount > 0 && seedCount === 0)
    return 'Out of seeds! Buy more from the Store.';
  if (growingCount > 0)
    return '🌱 Crops are growing… check back soon!';
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
      div.innerHTML = `<div class="plot-emoji">${c.emoji}</div><div class="plot-label">Ready!</div>`;
    } else if (plot.crop) {
      const c = CROPS[plot.crop];
      const pct = Math.floor(plot.progress);
      const grow = pct >= 66 ? c.emoji : pct >= 33 ? '🌿' : '🌱';
      div.classList.add('plot-growing');
      div.innerHTML = `
        <div class="plot-emoji">${grow}</div>
        <div class="plot-bar"><div class="plot-bar-fill" style="width:${pct}%"></div></div>
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
  const seedEl = el('seed-shop');
  seedEl.innerHTML = '';

  Object.entries(CROPS).forEach(([id, crop]) => {
    const unlocked = isUnlocked(id);
    const card = document.createElement('div');
    card.className = `seed-card${unlocked ? '' : ' locked'}`;
    const owned = state.seeds[id] || 0;
    const isSel = state.selectedSeed === id;

    if (!unlocked) {
      const need = crop.unlockAt - state.totalEarned;
      card.innerHTML = `
        <div class="seed-emoji">🔒</div>
        <div class="seed-name">${crop.name}</div>
        <div class="seed-unlock">Earn ${need} more coins total</div>`;
    } else {
      card.innerHTML = `
        <div class="seed-emoji">${crop.emoji}</div>
        <div class="seed-name">${crop.name}</div>
        <div class="seed-info"><span>🌱 ${crop.seedCost}💰</span><span>🛒 ${crop.sellPrice}💰</span></div>
        <div class="seed-info"><span>⏱️ ${crop.growTime}s</span><span>📦 ${owned}</span></div>
        <div class="seed-btns">
          <button onclick="buySeeds('${id}',1)" ${state.coins < crop.seedCost ? 'disabled' : ''}>Buy 1</button>
          <button onclick="buySeeds('${id}',5)" ${state.coins < crop.seedCost * 5 ? 'disabled' : ''}>×5</button>
        </div>
        ${owned > 0 ? `<button class="select-btn${isSel ? ' selected' : ''}" onclick="selectSeed('${id}')">${isSel ? '✓ Selected' : 'Equip'}</button>` : ''}`;
    }
    seedEl.appendChild(card);
  });

  const upgEl = el('upgrade-shop');
  upgEl.innerHTML = '';

  UPGRADES.forEach(upg => {
    const owned    = state.upgrades[upg.id];
    const canAfford = state.coins >= upg.cost;
    const reqMet   = !upg.req || state.upgrades[upg.req];
    const card = document.createElement('div');
    card.className = `upg-card${owned ? ' upg-owned' : ''}${!reqMet ? ' locked' : ''}`;

    let action;
    if (owned) {
      action = '<span class="upg-badge">✅ Owned</span>';
    } else if (!reqMet) {
      const rName = UPGRADES.find(u => u.id === upg.req)?.name;
      action = `<span class="upg-lock">Requires ${rName}</span>`;
    } else {
      action = `<button onclick="buyUpgrade('${upg.id}')" class="${canAfford ? '' : 'cant-afford'}">${upg.cost}💰</button>`;
    }

    card.innerHTML = `
      <div class="upg-info">
        <div class="upg-name">${upg.name}</div>
        <div class="upg-desc">${upg.desc}</div>
      </div>
      <div class="upg-action">${action}</div>`;
    upgEl.appendChild(card);
  });

  el('stat-speed').textContent = `${growthMultiplier()}×`;
}

function renderBag() {
  const bagEl = el('bag-contents');
  const items = Object.entries(state.bag).filter(([, q]) => q > 0);
  el('stat-total-earned').textContent = state.totalEarned;
  el('stat-total-harvested').textContent = state.totalHarvested;

  if (items.length === 0) {
    bagEl.innerHTML = '<p class="empty-msg">Your bag is empty.<br>Harvest crops to fill it!</p>';
    return;
  }

  let total = 0;
  bagEl.innerHTML = items.map(([id, qty]) => {
    const c = CROPS[id];
    const val = c.sellPrice * qty;
    total += val;
    return `<div class="bag-item">
      <span class="bag-emoji">${c.emoji}</span>
      <span class="bag-name">${c.name}</span>
      <span class="bag-qty">×${qty}</span>
      <span class="bag-val">${val}💰</span>
    </div>`;
  }).join('');

  bagEl.innerHTML += `<div class="bag-total">
    <span>Total: ${total}💰</span>
    <button class="gold-btn" onclick="sellAll()">Sell All</button>
  </div>`;
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

let toastTimer;
function toast(msg, type = 'info') {
  const t = el('toast');
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
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
