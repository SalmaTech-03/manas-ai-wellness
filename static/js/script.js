// js/script.js --- FINAL CORRECTED VERSION ---

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    const elements = {
        userLevel: document.getElementById('user-level'), xpProgress: document.getElementById('xp-progress'), glowBerries: document.getElementById('glow-berries'),
        nuruMascot: document.getElementById('nuru-mascot'), emotionDisplay: document.getElementById('emotion-display'),
        orbChat: document.getElementById('orb-chat'), orbMood: document.getElementById('orb-mood'), orbGoal: document.getElementById('orb-goal'),
        orbWisdom: document.getElementById('orb-wisdom'), orbCave: document.getElementById('orb-cave'),
        orbIntent: document.getElementById('orb-intent'), orbQa: document.getElementById('orb-qa'),
        orbPoem: document.getElementById('orb-poem'), orbMeditation: document.getElementById('orb-meditation'), 
        // orbArt is now correctly removed from this list
        modal: document.getElementById('feature-modal'), closeModal: document.getElementById('close-modal'),
        modalTitle: document.getElementById('modal-title'), modalBody: document.getElementById('modal-body'), toast: document.getElementById('toast'),
    };
    let gameState = { level: 1, wp: 0, wpToNextLevel: 100, glowBerries: 0, conversationHistory: [], moodHistory: [] };

    // --- CORE APP LOGIC (Unchanged) ---
    function saveData() { localStorage.setItem('manasGameState', JSON.stringify(gameState)); }
    function loadData() { const savedState = localStorage.getItem('manasGameState'); if (savedState) gameState = JSON.parse(savedState); }
    function addWP(amount, action) { gameState.wp += amount; showToast(`+${amount} WP for ${action}!`); if (gameState.wp >= gameState.wpToNextLevel) levelUp(); updateStatsUI(); saveData(); }
    function levelUp() { gameState.level++; gameState.wp -= gameState.wpToNextLevel; gameState.wpToNextLevel = Math.floor(gameState.wpToNextLevel * 1.5); gameState.glowBerries += 10; showToast(`🎉 Level Up! You are Level ${gameState.level}! (+10 ✨)`); }
    function updateStatsUI() { elements.userLevel.textContent = `LVL ${gameState.level}`; const xpPercentage = (gameState.wp / gameState.wpToNextLevel) * 100; elements.xpProgress.style.width = `${xpPercentage}%`; elements.glowBerries.textContent = `✨ ${gameState.glowBerries}`; }
    function updateNuru() {
        const lastMood = gameState.moodHistory[gameState.moodHistory.length - 1]?.mood || 'calm';
        elements.emotionDisplay.textContent = `${lastMood.charAt(0).toUpperCase() + lastMood.slice(1)}`;
        if (lastMood === 'happy') elements.nuruMascot.src = '/static/images/nuru-happy.png';
        else if (lastMood === 'sad') elements.nuruMascot.src = '/static/images/nuru-sad.png';
        else elements.nuruMascot.src = '/static/images/nuru-neutral.png';
    }
    function showToast(message) { elements.toast.textContent = message; elements.toast.classList.remove('hidden'); setTimeout(() => elements.toast.classList.add('hidden'), 2500); }

    // --- MODAL MANAGEMENT (Corrected) ---
    function openModal(title, feature) {
        elements.modalTitle.textContent = title;
        elements.modalBody.innerHTML = '';
        if (feature === 'chat') { openChat(); }
        else if (feature === 'mood') { openMoodLogger(); }
        else if (feature === 'goal') { openGoalCoach(); }
        else if (feature === 'wisdom') { openWisdomStone(); }
        else if (feature === 'cave') { openEchoCave(); }
        else if (feature === 'intent') { openIntentRecognizer(); }
        else if (feature === 'qa') { openQuestionAnswering(); }
        else if (feature === 'poem') { generatePoem(); }
        else if (feature === 'meditation') { openGuidedMeditation(); }
        // The 'art' case is now correctly removed
        else { elements.modalBody.innerHTML = `<div class="feature-container"><p>${title} coming soon!</p></div>`; }
        elements.modal.classList.remove('hidden');
    }

    // --- FEATURE IMPLEMENTATIONS (Unchanged) ---
    function openMoodLogger() {
        elements.modalBody.innerHTML = `<div class="feature-container" style="text-align: center;"><h3>How are you feeling right now?</h3><div class="mood-buttons"><button class="mood-btn" data-mood="happy">😊 Happy</button> <button class="mood-btn" data-mood="calm">😌 Calm</button><button class="mood-btn" data-mood="sad">😢 Sad</button> <button class="mood-btn" data-mood="anxious">😟 Anxious</button><button class="mood-btn" data-mood="neutral">😐 Neutral</button></div></div>`;
        document.querySelectorAll('.mood-btn').forEach(button => button.addEventListener('click', () => logMood(button.dataset.mood)));
    }
    function logMood(mood) {
        gameState.moodHistory.push({ mood, timestamp: new Date().toISOString() });
        showToast(`Mood logged: ${mood}!`); addWP(15, 'Logging Mood'); updateNuru(); saveData();
        elements.modal.classList.add('hidden');
    }
    function openChat() {
        elements.modalBody.innerHTML = `<div class="chat-container"><div id="chat-window" class="chat-window"></div><div class="chat-input-area"><input type="text" id="chat-input" placeholder="Type a message..."><button id="chat-send">Send</button><button id="chat-reflect-btn" title="Reflect on our conversation" disabled>Reflect</button></div></div>`;
        const chatWindow = document.getElementById('chat-window');
        gameState.conversationHistory.forEach(msg => addMessage(msg.parts[0].text, msg.role === 'user' ? 'user' : 'model', false));
        chatWindow.scrollTop = chatWindow.scrollHeight;
        document.getElementById('chat-send').addEventListener('click', sendMessage);
        document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
        document.getElementById('chat-reflect-btn').addEventListener('click', summarizeConversation);
        if (gameState.conversationHistory.length >= 4) { document.getElementById('chat-reflect-btn').disabled = false; }
    }
    function addMessage(text, sender, addToHistory = true) {
        const chatWindow = document.getElementById('chat-window'); if (!chatWindow) return;
        const msgEl = document.createElement('div'); msgEl.classList.add('chat-message', `${sender}-message`); msgEl.textContent = text;
        chatWindow.appendChild(msgEl);
        if (addToHistory) { gameState.conversationHistory.push({ role: sender, parts: [{ text }] }); saveData(); }
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    async function sendMessage() {
        const input = document.getElementById('chat-input'); const message = input.value.trim(); if (!message) return;
        addMessage(message, 'user'); input.value = '';
        if (gameState.conversationHistory.length >= 4) { const reflectBtn = document.getElementById('chat-reflect-btn'); if (reflectBtn) reflectBtn.disabled = false; }
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "history": gameState.conversationHistory }) });
            const data = await response.json(); addMessage(data.error || data.text, 'model');
            if (!data.error) addWP(25, 'AI Chat');
        } catch (error) { addMessage("Sorry, connection error.", 'model'); }
    }
    async function summarizeConversation() {
        const chatWindow = document.getElementById('chat-window'); if (!chatWindow) return;
        chatWindow.innerHTML = `<p>Generating your reflection...</p>`;
        try {
            const response = await fetch(`${API_BASE_URL}/summarize-chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "history": gameState.conversationHistory }) });
            const data = await response.json(); if (data.error) { chatWindow.innerHTML = `<p>Error: ${data.error}</p>`; return; }
            chatWindow.innerHTML = `<div class="chat-summary-container"><h4>A Moment of Reflection</h4><p>${data.summary}</p></div>`; addWP(30, 'Conversation Reflection');
        } catch (error) { chatWindow.innerHTML = `<p>Sorry, a connection error occurred.</p>`; }
    }
    async function openIntentRecognizer() {
        const lastMessage = gameState.conversationHistory.findLast(msg => msg.role === 'user')?.parts[0].text;
        if (!lastMessage) { elements.modalBody.innerHTML = `<p>Please chat a little first so I can understand your intent.</p>`; return; }
        elements.modalBody.innerHTML = `<p>Analyzing the intent...</p>`; addWP(30, 'Intent Analysis');
        const myIntents = ["seeking advice", "venting frustration", "sharing happiness", "asking a question"];
        try {
            const response = await fetch(`${API_BASE_URL}/analyze-intent`, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "text": lastMessage, "candidate_labels": myIntents }), });
            const result = await response.json();
            elements.modalBody.innerHTML = `<div class="feature-container"><h3>Your Last Intent</h3><p>Your message: "<em>${lastMessage}</em>"</p><p>Detected Intent: <strong>${result.labels[0]}</strong></p><p>Confidence: ${Math.round(result.scores[0] * 100)}%</p></div>`;
        } catch (error) { elements.modalBody.innerHTML = `<p>Sorry, could not determine intent.</p>`; }
    }
    function openQuestionAnswering() {
        elements.modalBody.innerHTML = `<div class="feature-container"><h3>Analyze Text</h3><p>Paste text below, then ask a specific question about it.</p><textarea id="qa-context" placeholder="Paste the text to analyze here..."></textarea><input type="text" id="qa-question" placeholder="Ask a question about the text..."><button id="qa-submit">Get Answer</button><div id="qa-answer" style="margin-top: 15px;"></div></div>`;
        document.getElementById('qa-submit').addEventListener('click', async () => {
            const context = document.getElementById('qa-context').value, question = document.getElementById('qa-question').value; if (!context || !question) return;
            const answerDiv = document.getElementById('qa-answer'); answerDiv.innerHTML = `<p>Searching for the answer...</p>`; addWP(35, 'Text Analysis');
            try {
                const response = await fetch(`${API_BASE_URL}/qa`, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context }), });
                const result = await response.json(); answerDiv.innerHTML = `<p><strong>Answer:</strong> ${result.answer}</p>`;
            } catch (error) { answerDiv.innerHTML = `<p>Sorry, I couldn't find an answer in that text.</p>`; }
        });
    }
    async function generatePoem() {
        const lastMood = gameState.moodHistory[gameState.moodHistory.length - 1]?.mood || 'calm';
        elements.modalBody.innerHTML = `<p>Crafting a unique poem for you...</p>`; addWP(20, 'Poem Generation');
        const prompt = `Write a short, hopeful, 4-line poem about the feeling of ${lastMood}.`;
        try {
            const response = await fetch(`${API_BASE_URL}/generate-poem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
            const data = await response.json();
            elements.modalBody.innerHTML = `<div class="feature-container"><h3>A Poem For You</h3><p style="white-space: pre-wrap;">${data.poem}</p></div>`;
        } catch (error) { elements.modalBody.innerHTML = `<p>Sorry, the muse is sleeping right now.</p>`; }
    }
    async function openGuidedMeditation() {
        let selectedTopic = 'Stress Relief', selectedDuration = '2 minutes';
        elements.modalBody.innerHTML = `<div class="meditation-options"><div class="meditation-option-group" id="meditation-topic"><h4>Choose a Topic</h4><button class="selected">Stress Relief</button><button>Focus</button><button>Sleep</button><button>Gratitude</button></div><div class="meditation-option-group" id="meditation-duration"><h4>Choose a Duration</h4><button class="selected">2 minutes</button><button>5 minutes</button><button>10 minutes</button></div><button id="begin-meditation-btn">Begin</button></div>`;
        document.querySelectorAll('.meditation-option-group button').forEach(button => {
            button.addEventListener('click', () => {
                const parentGroup = button.parentElement;
                parentGroup.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                if (parentGroup.id === 'meditation-topic') selectedTopic = button.textContent; else if (parentGroup.id === 'meditation-duration') selectedDuration = button.textContent;
            });
        });
        document.getElementById('begin-meditation-btn').addEventListener('click', async () => {
            elements.modalBody.innerHTML = `<p>Generating your custom meditation script...</p>`; addWP(40, 'Guided Meditation');
            try {
                const textResponse = await fetch(`${API_BASE_URL}/generate-meditation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: selectedTopic, duration: selectedDuration }) });
                const textData = await textResponse.json(); if (textData.error) { elements.modalBody.innerHTML = `<p>Error: ${textData.error}</p>`; return; }
                elements.modalBody.innerHTML = `<div class="meditation-player-container"><button id="meditation-play-pause-btn">▶</button><p id="meditation-player-status">Generating audio, please wait...</p></div><div class="meditation-script-container">${textData.script.split('\n').map(p => `<p>${p}</p>`).join('')}</div>`;
                const audioResponse = await fetch(`${API_BASE_URL}/text-to-speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: textData.script }) });
                if (!audioResponse.ok) throw new Error('Failed to generate audio.');
                const audioBlob = await audioResponse.blob(); const audioUrl = URL.createObjectURL(audioBlob); const audio = new Audio(audioUrl);
                const playPauseBtn = document.getElementById('meditation-play-pause-btn'); const statusEl = document.getElementById('meditation-player-status');
                statusEl.textContent = 'Ready to play';
                playPauseBtn.addEventListener('click', () => { if (audio.paused) { audio.play(); playPauseBtn.textContent = '❚❚'; } else { audio.pause(); playPauseBtn.textContent = '▶'; } });
                audio.onended = () => { playPauseBtn.textContent = '▶'; statusEl.textContent = 'Finished'; };
            } catch (error) { elements.modalBody.innerHTML = `<p>Sorry, a connection error occurred: ${error.message}</p>`; }
        });
    }
    async function openGoalCoach() {
        elements.modalBody.innerHTML = `<div class="goal-container"><p>Tell me a goal you'd like to achieve. I'll help you break it down into simple, actionable steps.</p><div class="goal-input-area"><input type="text" id="goal-input" placeholder="e.g., 'Be more mindful'"><button id="create-plan-btn">Create My Plan</button></div><div id="goal-plan-display"></div></div>`;
        document.getElementById('create-plan-btn').addEventListener('click', async () => {
            const goalInput = document.getElementById('goal-input'), goal = goalInput.value.trim();
            if (!goal) { showToast("Please enter a goal first!"); return; }
            const planDisplay = document.getElementById('goal-plan-display');
            planDisplay.innerHTML = `<p>Crafting your personalized action plan...</p>`; addWP(45, 'Goal Coaching');
            try {
                const response = await fetch(`${API_BASE_URL}/coach-goal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal }) });
                const data = await response.json(); if (data.error) { planDisplay.innerHTML = `<p>Error: ${data.error}</p>`; return; }
                planDisplay.innerHTML = `<div class="goal-plan-container">${data.plan.replace(/\n/g, '<br>')}</div>`;
            } catch (error) { planDisplay.innerHTML = `<p>Sorry, a connection error occurred.</p>`; }
        });
    }
    async function openWisdomStone() {
        elements.modalBody.innerHTML = `
            <div class="wisdom-stone-container">
                <div id="wisdom-stone"></div>
                <p>Ask a question to seek a moment of wisdom.</p>
                <div id="wisdom-riddle" class="feature-container"></div>
                <div class="wisdom-input-area">
                    <input type="text" id="wisdom-question" placeholder="e.g., What should I focus on today?">
                    <button id="ask-wisdom-btn">Ask</button>
                </div>
            </div>`;
        
        document.getElementById('ask-wisdom-btn').addEventListener('click', async () => {
            const questionInput = document.getElementById('wisdom-question');
            const question = questionInput.value.trim();
            if (!question) { showToast("Please ask a question."); return; }

            const riddleContainer = document.getElementById('wisdom-riddle');
            const stone = document.getElementById('wisdom-stone');
            
            riddleContainer.innerHTML = `<p>The stone is listening...</p>`;
            stone.classList.add('charging');
            
            addWP(20, 'Seeking Wisdom');
            try {
                const response = await fetch(`${API_BASE_URL}/get-wisdom-riddle`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question })
                });
                const data = await response.json();
                if (data.error || !data.riddle) throw new Error(data.error || "The stone's wisdom is unclear.");
                riddleContainer.innerHTML = `<p>"${data.riddle}"</p>`;
            } catch (error) {
                riddleContainer.innerHTML = `<p>The mists around the stone are too thick to see clearly now.</p>`;
            } finally {
                setTimeout(() => stone.classList.remove('charging'), 2000);
            }
        });
    }
    async function openEchoCave() {
        elements.modalBody.innerHTML = `
            <div class="echo-cave-container">
                <div id="echo-cave"></div>
                <p>Whisper a word into the cave and listen to its echo.</p>
                <div id="echo-player"></div>
                <div class="echo-input-area">
                    <input type="text" id="echo-word" placeholder="e.g., Peace, Lost, Joy...">
                    <button id="generate-echo-btn">Listen</button>
                </div>
            </div>`;
        
        document.getElementById('generate-echo-btn').addEventListener('click', async () => {
            const wordInput = document.getElementById('echo-word');
            const word = wordInput.value.trim().split(' ')[0];
            if (!word) { showToast("Please provide a word."); return; }

            const playerContainer = document.getElementById('echo-player');
            playerContainer.innerHTML = `<p>The cave is gathering its voice...</p>`;
            addWP(40, 'Echo Cave');

            try {
                const response = await fetch(`${API_BASE_URL}/generate-soundscape`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word })
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "The cave remains silent.");
                }
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                playerContainer.innerHTML = `<audio controls autoplay loop><source src="${audioUrl}" type="audio/wav"></audio>`;
            } catch (error) {
                playerContainer.innerHTML = `<p>Sorry, the echo faded. Please try another word.</p>`;
            }
        });
    }
    
    // --- APP INITIALIZATION ---
    function setupEventListeners() {
        elements.orbChat.addEventListener('click', () => openModal('Chat with Manas', 'chat'));
        elements.orbMood.addEventListener('click', () => openModal('Log Your Mood', 'mood'));
        elements.orbGoal.addEventListener('click', () => openModal('AI Goal Coach', 'goal'));
        elements.orbWisdom.addEventListener('click', () => openModal("Nuru's Wisdom Stone", 'wisdom'));
        elements.orbCave.addEventListener('click', () => openModal("Nuru's Echo Cave", 'cave'));
        elements.orbIntent.addEventListener('click', () => openModal('Understand My Intent', 'intent'));
        elements.orbQa.addEventListener('click', () => openModal('Analyze Text', 'qa'));
        elements.orbPoem.addEventListener('click', () => openModal('Generate a Poem', 'poem'));
        elements.orbMeditation.addEventListener('click', () => openModal('Guided Meditation', 'meditation'));
        // The 'orbArt' listener is now correctly removed
        elements.closeModal.addEventListener('click', () => {
            const audioElements = document.getElementsByTagName('audio');
            for(let i=0; i < audioElements.length; i++) {
                audioElements[i].pause();
            }
            elements.modal.classList.add('hidden');
        });
    }

    function initializeApp() { loadData(); updateStatsUI(); updateNuru(); setupEventListeners(); }
    initializeApp();
});