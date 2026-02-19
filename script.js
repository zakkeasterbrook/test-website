const clockHand = document.getElementById('clockHand');
const avgTimeEl = document.getElementById('avgTime');
const lastBlockEl = document.getElementById('lastBlock');
const etaEl = document.getElementById('eta');
const ticksEl = document.getElementById('ticks');

const API = {
  avgInterval: 'https://blockchain.info/q/interval?cors=true',
  latestBlock: 'https://blockchain.info/latestblock?cors=true'
};

const TEN_MINUTES_MS = 10 * 60 * 1000;
let averageBlockMs = TEN_MINUTES_MS;
let nextBlockEta = Date.now() + TEN_MINUTES_MS;

const tickCount = 10;
for (let i = 0; i < tickCount; i += 1) {
  const tick = document.createElement('span');
  tick.style.setProperty('--rotation', `${i * (360 / tickCount)}deg`);
  ticksEl.appendChild(tick);
}

function updateHand() {
  const now = Date.now();
  const elapsed = (now - (nextBlockEta - averageBlockMs));
  const clamped = Math.max(0, Math.min(elapsed, averageBlockMs));
  const fraction = clamped / averageBlockMs;
  const degrees = fraction * 360;
  clockHand.style.transform = `translate(-50%, -100%) rotate(${degrees}deg)`;
}

function updateCountdown() {
  const diff = Math.max(0, nextBlockEta - Date.now());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  etaEl.textContent = `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

async function fetchBlockData() {
  try {
    const [avgRes, latestRes] = await Promise.all([
      fetch(API.avgInterval),
      fetch(API.latestBlock)
    ]);

    if (!avgRes.ok || !latestRes.ok) throw new Error('Network response was not ok');

    const avgSeconds = parseFloat(await avgRes.text());
    const latestBlock = await latestRes.json();

    averageBlockMs = avgSeconds * 1000;
    nextBlockEta = (latestBlock.time * 1000) + averageBlockMs;

    avgTimeEl.textContent = `${(avgSeconds / 60).toFixed(2)} min`;
    lastBlockEl.textContent = `#${latestBlock.height}`;
  } catch (error) {
    console.error('Failed to fetch block data:', error);
    avgTimeEl.textContent = 'data unavailable';
    lastBlockEl.textContent = '—';
    etaEl.textContent = '—';
  }
}

setInterval(() => {
  updateHand();
  updateCountdown();
}, 1000);

fetchBlockData();
setInterval(fetchBlockData, 60_000);
