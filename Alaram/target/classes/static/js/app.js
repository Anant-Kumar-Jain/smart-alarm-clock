/**
 * Smart Alarm Clock Logic
 */

let alarms = [];
let clockInterval;
let alarmCheckerInterval;
let activeAlarmId = null;
let currentPuzzleAnswer = null;

// DOM Elements
const timeDisplay = document.getElementById('time-display');
const ampmDisplay = document.getElementById('am-pm-display');
const dateDisplay = document.getElementById('current-date');
const tempDisplay = document.getElementById('temperature');
const humDisplay = document.getElementById('humidity');

const alarmForm = document.getElementById('alarm-form');
const alarmsContainer = document.getElementById('alarms-container');
const alarmAudioSelect = document.getElementById('alarm-audio');
const customAudioGroup = document.getElementById('custom-audio-group');
const customAudioFile = document.getElementById('custom-audio-file');

alarmAudioSelect.addEventListener('change', () => {
    if(alarmAudioSelect.value === 'custom') {
        customAudioGroup.classList.remove('hidden');
    } else {
        customAudioGroup.classList.add('hidden');
    }
});

// Modals
const initOverlay = document.getElementById('init-overlay');
const startBtn = document.getElementById('start-btn');
const puzzleModal = document.getElementById('puzzle-modal');
const puzzleQuestion = document.getElementById('puzzle-question');
const puzzleAnswerInput = document.getElementById('puzzle-answer');
const submitPuzzleBtn = document.getElementById('submit-puzzle-btn');
const puzzleError = document.getElementById('puzzle-error');

// Audio
const audioBuzzer = document.getElementById('audio-buzzer');
const audioNature = document.getElementById('audio-nature');
const audioLofi = document.getElementById('audio-lofi');
const audioClassic = document.getElementById('audio-classic');
const audioElectronic = document.getElementById('audio-electronic');

// Theme elements
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const snoozeBtn = document.getElementById('snooze-btn');

// Init Theme
const savedTheme = localStorage.getItem('app-theme') || 'dark';
if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
}
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app-theme', newTheme);
    if(newTheme === 'light') {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(e => console.error(e));
}

// Initialization
fetchWeather();
fetchAlarms();

let unlockAudioContext = null;

startBtn.addEventListener('click', () => {
    // User interaction required to play audio later
    initOverlay.classList.add('hidden');
    startClock();
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
    
    // Background execution hack: Play a silent buffer continuously
    // This discourages mobile browsers from throttling the tab!
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        unlockAudioContext = new AudioContext();
        const buffer = unlockAudioContext.createBuffer(1, 1, 22050);
        const source = unlockAudioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(unlockAudioContext.destination);
        source.loop = true;
        source.start(0);
    }
});

// 1. Clock Logic
function startClock() {
    updateClock(); // Initial call
    clockInterval = setInterval(updateClock, 1000);
    // Check alarms every 5 seconds so we don't miss matching times
    alarmCheckerInterval = setInterval(checkAlarms, 5000);
}

function updateClock() {
    const now = new Date();

    // Format Time
    let hours = now.getHours();
    let mins = now.getMinutes();
    let secs = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12

    hours = String(hours).padStart(2, '0');
    mins = String(mins).padStart(2, '0');
    secs = String(secs).padStart(2, '0');

    timeDisplay.textContent = `${hours}:${mins}:${secs}`;
    ampmDisplay.textContent = ampm;

    // Format Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = now.toLocaleDateString(undefined, options);
}

// 2. Weather Logic
async function fetchWeather() {
    tempDisplay.textContent = "Locating...";
    
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                await doWeatherFetch(position.coords.latitude, position.coords.longitude);
            },
            async (error) => {
                console.warn("Geolocation denied or failed, falling back to default.", error);
                await doWeatherFetch(null, null);
            },
            { timeout: 5000 }
        );
    } else {
        await doWeatherFetch(null, null);
    }
}

async function doWeatherFetch(lat, lon) {
    try {
        let url = '/api/weather';
        if (lat !== null && lon !== null) {
            url += `?lat=${lat}&lon=${lon}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        if (data.temperature !== "N/A" && data.temperature !== undefined) {
            tempDisplay.textContent = `${data.temperature}°C`;
            humDisplay.textContent = `${data.humidity}%`;
        } else {
            tempDisplay.textContent = "N/A";
        }
    } catch (error) {
        console.error("Error fetching weather:", error);
        tempDisplay.textContent = "Error";
    }
}

// 3. Alarm CRUD Operations
async function fetchAlarms() {
    try {
        const response = await fetch('/api/alarms');
        alarms = await response.json();
        renderAlarms();
    } catch (error) {
        console.error("Error fetching alarms:", error);
        alarmsContainer.innerHTML = `<div class="error-text">Failed to load alarms attached to DB.</div>`;
    }
}

function renderAlarms() {
    alarmsContainer.innerHTML = '';
    if (alarms.length === 0) {
        alarmsContainer.innerHTML = `<div class="loading-text">No alarms created yet.</div>`;
        return;
    }

    alarms.forEach(alarm => {
        const card = document.createElement('div');
        card.className = 'alarm-card';

        let formattedTime = get12HourTime(alarm.time);

        const daysHtml = alarm.days && alarm.days.length > 0
            ? alarm.days.join(', ')
            : 'One time';

        const featuresHtml = [];
        if (alarm.isMathPuzzleRequired) featuresHtml.push('<i class="fa-solid fa-puzzle-piece"></i> Math');
        featuresHtml.push(`<i class="fa-solid fa-music"></i> ${alarm.audioMode}`);

        card.innerHTML = `
            <div class="alarm-info">
                <h4>${formattedTime}</h4>
                <div class="alarm-details">
                    <span><i class="fa-regular fa-calendar"></i> ${daysHtml}</span>
                    <span>${featuresHtml.join(' | ')}</span>
                </div>
            </div>
            <div class="alarm-actions">
                <label class="switch">
                    <input type="checkbox" onchange="toggleAlarm(${alarm.id}, this.checked)" ${alarm.active ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <button class="btn-delete" onclick="deleteAlarm(${alarm.id})" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        alarmsContainer.appendChild(card);
    });
}

function get12HourTime(time24h) {
    if (!time24h) return "00:00 AM";
    const [h, m] = time24h.split(':');
    let hNum = parseInt(h);
    const ampm = hNum >= 12 ? 'PM' : 'AM';
    hNum = hNum % 12;
    hNum = hNum ? hNum : 12;
    return `${String(hNum).padStart(2, '0')}:${m} ${ampm}`;
}

alarmForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get checked days
    const dayCheckboxes = document.querySelectorAll('.days-container input[type="checkbox"]:checked');
    const selectedDays = Array.from(dayCheckboxes).map(cb => cb.value);

    let customAudioUrl = null;
    if (document.getElementById('alarm-audio').value === 'custom') {
        const file = customAudioFile.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                if(uploadRes.ok) {
                    const data = await uploadRes.json();
                    customAudioUrl = data.url;
                }
            } catch (err) {
                console.error("Upload failed", err);
            }
        }
    }

    const newAlarm = {
        time: document.getElementById('alarm-time').value, // format HH:mm
        days: selectedDays,
        audioMode: document.getElementById('alarm-audio').value,
        customAudioUrl: customAudioUrl,
        snoozeLength: 9, // default
        isMathPuzzleRequired: document.getElementById('alarm-puzzle').checked,
        active: true
    };

    try {
        const res = await fetch('/api/alarms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAlarm)
        });
        if (res.ok) {
            alarmForm.reset();
            // Clear checked days manually
            document.querySelectorAll('.days-container input[type="checkbox"]').forEach(cb => cb.checked = false);
            fetchAlarms();
        }
    } catch (err) {
        console.error("Failed to save alarm", err);
    }
});

async function toggleAlarm(id, isActive) {
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
        alarm.active = isActive;
        try {
            await fetch(`/api/alarms/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alarm)
            });
            fetchAlarms();
        } catch (err) {
            console.error(err);
        }
    }
}

async function deleteAlarm(id) {
    if (confirm("Are you sure you want to delete this alarm?")) {
        try {
            await fetch(`/api/alarms/${id}`, { method: 'DELETE' });
            fetchAlarms();
        } catch (err) {
            console.error(err);
        }
    }
}

// 4. Alarm Trigger & Dismissal Logic
function checkAlarms() {
    const now = new Date();
    // JS getDay(): 0=Sun, 1=Mon, 2=Tue...
    const daysMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const currentDay = daysMap[now.getDay()];

    let currentH = String(now.getHours()).padStart(2, '0');
    let currentM = String(now.getMinutes()).padStart(2, '0');
    let currentTimeStr = `${currentH}:${currentM}`;

    // Look for active alarms matching exact time
    const ringingAlarm = alarms.find(a => {
        if (!a.active) return false;
        if (a.time !== currentTimeStr) return false;

        // If days array is empty, it means "one time / any day" - ring it.
        // If it has days, it must include current day
        if (a.days && a.days.length > 0 && !a.days.includes(currentDay)) return false;

        // Note: In a robust app, we'd mark it as "rung today" to prevent ringing again in the same minute
        if (a._hasRungToday && a._hasRungToday === new Date().toLocaleDateString()) return false;

        return true;
    });

    if (ringingAlarm) {
        triggerAlarm(ringingAlarm);
        ringingAlarm._hasRungToday = new Date().toLocaleDateString();
    }
}

let currentCustomAudio = null;

function triggerAlarm(alarm) {
    if (activeAlarmId) return; // already ringing
    activeAlarmId = alarm.id;

    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('Alarm: ' + get12HourTime(alarm.time), {
                body: 'Your alarm is ringing. Tap to wake up!',
                requireInteraction: true,
                silent: false,
                vibrate: [500, 250, 500, 250, 500, 250, 500, 250, 500, 250, 500]
            });
        });
    }

    // Play correct audio
    if (alarm.audioMode === 'nature') {
        audioNature.play();
    } else if (alarm.audioMode === 'lofi') {
        audioLofi.play();
    } else if (alarm.audioMode === 'classic') {
        audioClassic.play();
    } else if (alarm.audioMode === 'electronic') {
        audioElectronic.play();
    } else if (alarm.audioMode === 'custom' && alarm.customAudioUrl) {
        currentCustomAudio = new Audio(alarm.customAudioUrl);
        currentCustomAudio.loop = true;
        currentCustomAudio.play().catch(e => {
             console.error("Failed to play custom audio", e);
             audioBuzzer.play();
        });
    } else {
        audioBuzzer.play();
    }

    // Check if math puzzle needed
    if (alarm.isMathPuzzleRequired) {
        showMathPuzzle();
    } else {
        // Simple dismissal button can be shown, or we use the puzzle modal but bypass logic
        // For simplicity, we just show a simple math puzzle 1 + 1 to keep UI consistent, or a simple "Dismiss" modal
        generateMathPuzzle(false); // simple default mode
    }
}

function showMathPuzzle() {
    puzzleModal.classList.remove('hidden');
    puzzleError.classList.add('hidden');
    puzzleAnswerInput.value = '';
    generateMathPuzzle(true);
}

function generateMathPuzzle(isHard) {
    puzzleModal.classList.remove('hidden');
    puzzleError.classList.add('hidden');
    puzzleAnswerInput.value = '';

    if (isHard) {
        // Generate actual puzzle
        const num1 = Math.floor(Math.random() * 50) + 10;
        const num2 = Math.floor(Math.random() * 50) + 10;
        currentPuzzleAnswer = num1 + num2;
        puzzleQuestion.textContent = `${num1} + ${num2} = ?`;
    } else {
        // Simple dismiss
        currentPuzzleAnswer = 2;
        puzzleQuestion.textContent = `1 + 1 = ?`;
    }
}

submitPuzzleBtn.addEventListener('click', dismissAlarm);
puzzleAnswerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') dismissAlarm();
});

function stopAllAudio() {
    audioBuzzer.pause(); audioBuzzer.currentTime = 0;
    audioNature.pause(); audioNature.currentTime = 0;
    audioLofi.pause(); audioLofi.currentTime = 0;
    audioClassic.pause(); audioClassic.currentTime = 0;
    audioElectronic.pause(); audioElectronic.currentTime = 0;
    if (currentCustomAudio) {
        currentCustomAudio.pause();
        currentCustomAudio.currentTime = 0;
        currentCustomAudio = null;
    }
}

snoozeBtn.addEventListener('click', () => {
    const alarm = alarms.find(a => a.id === activeAlarmId);
    const snoozeMins = alarm && alarm.snoozeLength ? alarm.snoozeLength : 9;
    
    stopAllAudio();
    puzzleModal.classList.add('hidden');
    
    const now = new Date();
    now.setMinutes(now.getMinutes() + snoozeMins);
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    
    const tempAlarm = { 
        ...(alarm || { audioMode: 'buzzer', isMathPuzzleRequired: false }), 
        id: 'snooze_' + Date.now(), 
        time: `${h}:${m}`, 
        active: true, 
        days: [] 
    };
    alarms.push(tempAlarm);
    activeAlarmId = null;
});

function dismissAlarm() {
    const userAnswer = parseInt(puzzleAnswerInput.value);
    if (userAnswer === currentPuzzleAnswer) {
        // Success
        stopAllAudio();
        puzzleModal.classList.add('hidden');

        // Find the active alarm before clearing ID
        const alarm = alarms.find(a => a.id === activeAlarmId);
        if (alarm && (!alarm.days || alarm.days.length === 0)) {
            // One time alarm, turn it off
            toggleAlarm(alarm.id, false);
        }

        activeAlarmId = null;
    } else {
        // Fail
        puzzleError.classList.remove('hidden');
        // Shake animation could go here
    }
}
