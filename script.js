'use strict';

const clockHand = document.getElementById('clockHand');
const avgTimeEl = document.getElementById('avgTime');
const lastBlockEl = document.getElementById('lastBlock');
const lastAgoEl = document.getElementById('lastAgo');
const etaEl = document.getElementById('eta');
const refreshBtn = document.getElementById('refresh');
const ticksEl = document.getElementById('ticks');

const API = {
  avgInterval: 'https://blockchain.info/q/interval?cors=true',
  latestBlock: 'https://blockchain.info/latestblock?cors=true'
};

const TEN_MINUTES_MS = 10 * 60 * 1000;
let averageBlockMs = TEN_MINUTES_MS;
let nextBlockEta = Date.now() + TEN_MINUTES_MS;

const tickCount = 60;
if (!ticksEl.hasChildNodes()) {
  for (let i = 0; i < tickCount; i += 1) {
    const tick = document.createElement('span');
    tick.style.transform = `rotate(${i * (360 / tickCount)}deg)`;
    ticksEl.appendChild(tick);
  }
}

function updateDial() {
  const now = Date.now();
  const elapsed = now - (nextBlockEta - averageBlockMs);
  const fraction = Math.max(0, Math.min(1, elapsed / averageBlockMs));
  const degrees = fraction * 360;
  clockHand.style.transform = `translate(-50%, -100%) rotate(${degrees}deg)`;
  const remaining = Math.max(0, nextBlockEta - now);
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  etaEl.textContent = `${m}m ${s.toString().padStart(2, '0')}s`;
  requestAnimationFrame(updateDial);
}
requestAnimationFrame(updateDial);

async function fetchData() {
  try {
    refreshBtn.disabled = true;
    const [avgRes, latestRes] = await Promise.all([
      fetch(API.avgInterval, { cache: 'no-cache' }),
      fetch(API.latestBlock, { cache: 'no-cache' })
    ]);
    if (!avgRes.ok || !latestRes.ok) throw new Error('Network error');

    const avgSeconds = parseFloat(await avgRes.text());
    const latest = await latestRes.json();

    averageBlockMs = avgSeconds * 1000;
    nextBlockEta = (latest.time * 1000) + averageBlockMs;

    avgTimeEl.textContent = `${(avgSeconds / 60).toFixed(2)} min`;
    lastBlockEl.textContent = `#${latest.height}`;
    const minutesAgo = Math.round((Date.now() - latest.time * 1000) / 60000);
    lastAgoEl.textContent = `${minutesAgo} min ago`;
    statusEl?.textContent = 'Live';
  } catch (err) {
    console.error(err);
    avgTimeEl.textContent = 'unavailable';
    lastBlockEl.textContent = '—';
    etaEl.textContent = '—';
    statusEl?.textContent = 'Error fetching data';
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', fetchData);
fetchData();
setInterval(fetchData, 60_000);
