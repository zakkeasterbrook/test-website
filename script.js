const clockHand = document.getElementById('clockHand');

// Function to adjust clock hand
function updateClock() {
    const now = new Date();
    const minutes = (now.getUTCMinutes() % 10) * 36; // Every 10 min = 360 degrees
    clockHand.style.transform = `rotate(${90 - minutes}deg`;
}

// Update clock every second
setInterval(updateClock, 1000);