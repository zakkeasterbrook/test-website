'use strict';

const SOURCES = [
  'https://mempool.space/api/blocks?limit=6',
  'https://blockstream.info/api/blocks?limit=6'
];

const clockHand = document.getElementById('clockHand');
const avgTimeEl = document.getElementById('avgTime');
const lastBlockEl = document.getElementById('lastBlock');
const lastAgoEl = document.getElementById('lastAgo');
const etaEl = document.getElementById('eta');
const refreshBtn = document.getElementById('refresh');
const ticksEl = document.getElementById('ticks');
const feedEl = document.getElementById('blockFeed');
const tickerEl = document.getElementById('ticker');

const TEN_MINUTES_MS = 10 * 60 * 1000;
let averageBlockMs = TEN_MINUTES_MS;
let nextBlockEta = Date.now() + TEN_MINUTES_MS;
let lastBlocks = [];

const tickCount = 120;
if (!ticksEl.hasChildNodes()) {
  for (let i = 0; i < tickCount; i += 1) {
    const tick = document.createElement('span');
    tick.style.transform = `rotate(${i * (360 / tickCount)}deg)`;
    tick.style.opacity = i % 10 === 0 ? '0.6' : '0.25';
    ticksEl.appendChild(tick);
  }
}

function updateDial() {
  const now = Date.now();
  const elapsed = now - (nextBlockEta - averageBlockMs);
  const rawFraction = elapsed / averageBlockMs;
  const fraction = ((rawFraction % 1) + 1) % 1;
  const degrees = fraction * 360;
  clockHand.style.transform = `translate(-50%, -100%) rotate(${degrees}deg)`;

  const remaining = nextBlockEta - now;
  const m = Math.max(0, Math.floor(remaining / 60000));
  const s = Math.max(0, Math.floor((remaining % 60000) / 1000));
  etaEl.textContent = `${m}m ${s.toString().padStart(2, '0')}s`;

  requestAnimationFrame(updateDial);
}
requestAnimationFrame(updateDial);

async function fetchBlocks() {
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) continue;
      const data = await res.json();
      const blocks = (data ?? [])
        .filter((block) => Number.isFinite(block.timestamp) && block.height)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 6);
      if (blocks.length >= 2) return blocks;
    } catch (err) {
      console.warn('Block source failed', url, err);
    }
  }
  throw new Error('All block sources failed');
}

function renderFeed(blocks) {
  feedEl.innerHTML = blocks.map((block) => {
    const minutesAgo = Math.round((Date.now() - block.timestamp * 1000) / 60000);
    return `<div class="item"><span>#${block.height}</span><span>${minutesAgo}m ago</span></div>`;
  }).join('');
}

function updateTicker(blocks) {
  if (!tickerEl) return;
  const snippets = blocks.slice(0, 3).map((block) => `#${block.height}`);
  tickerEl.textContent = `Blocks streaming: ${snippets.join(' • ')} • Avg ${(
    averageBlockMs /
    60000
  ).toFixed(2)} min`;
}

async function fetchData() {
  try {
    refreshBtn.disabled = true;
    const blocks = await fetchBlocks();
    lastBlocks = blocks;

    const intervals = [];
    for (let i = 0; i < blocks.length - 1; i += 1) {
      intervals.push((blocks[i].timestamp - blocks[i + 1].timestamp) * 1000);
    }
    const observedAvg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    averageBlockMs = Number.isFinite(observedAvg) && observedAvg > 0 ? observedAvg : TEN_MINUTES_MS;
    nextBlockEta = (blocks[0].timestamp * 1000) + averageBlockMs;

    avgTimeEl.textContent = `${(averageBlockMs / 60000).toFixed(2)} min`;
    lastBlockEl.textContent = `#${blocks[0].height}`;
    const minutesAgo = Math.round((Date.now() - blocks[0].timestamp * 1000) / 60000);
    lastAgoEl.textContent = `${minutesAgo} min ago`;

    renderFeed(blocks);
    updateTicker(blocks);
  } catch (err) {
    console.error(err);
    avgTimeEl.textContent = 'unavailable';
    lastBlockEl.textContent = '—';
    lastAgoEl.textContent = '—';
    etaEl.textContent = '—';
    feedEl.innerHTML = '<div class="item">Feed unavailable</div>';
    if (tickerEl) tickerEl.textContent = 'Data feed unavailable';
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', fetchData);
fetchData();
setInterval(fetchData, 60_000);
