// Manas AI Wellness Companion - Advanced Interactive JavaScript (v2.9 - Final Fixes)

class ManasApp {
    constructor() {
        // --- User State ---
        this.userName = 'Friend';
        this.userLevel = 1;
        this.userXP = 0;
        this.maxXP = 500;
        this.currentMood = 'Calm';

        // --- Session State & Timer Handles ---
        this.breathingActive = false;
        this.breathingInterval = null;
        this.meditationActive = false;
        this.meditationInterval = null;
        this.detoxActive = false;
        this.detoxInterval = null;
        
        // --- App Configuration ---
        this.apiBaseUrl = 'http://127.0.0.1:8000';

        this.features = {
            chat: { title: 'AI Chat Companion' },
            mood: { title: 'Mood Logger' },
            goal: { title: 'AI Goal Coach' },
            breathe: { title: 'Breathing Guide' },
            zones: { title: 'Safe Zone Locator' },
            schedule: { title: 'Smart Scheduling' },
            wisdom: { title: 'Wisdom Stone' },
            cave: { title: 'Echo Cave' },
            poem: { title: 'Poem Generator' },
            meditation: { title: 'Guided Meditation' },
            detox: { title: 'Digital Detox' }
        };
        
        this.moodOptions = [
            { emoji: '😊', name: 'Happy' }, { emoji: '😌', name: 'Calm' },
            { emoji: '😔', name: 'Sad' }, { emoji: '😰', name: 'Anxious' },
            { emoji: '😴', name: 'Tired' }, { emoji: '🤔', name: 'Thoughtful' }
        ];
        
        this.breathingPatterns = [
            { name: '4-7-8 Relaxation', inhale: 4, hold: 7, exhale: 8, pause: 0 },
            { name: 'Box Breathing', inhale: 4, hold: 4, exhale: 4, pause: 4 },
            { name: 'Deep Calm', inhale: 6, hold: 2, exhale: 8, pause: 0 }
        ];

        this.dailyQuotes = [
            "The quieter you become, the more you are able to hear.",
            "Stillness is the altar of spirit.",
            "The journey of a thousand miles begins with a single step.",
            "Your breath is your anchor in the storm of thoughts.",
            "Peace comes from within. Do not seek it without."
        ];
        
        this.init();
    }
    
    // --- Core Methods ---
    
    init() {
        this.bindStaticEvents();
        this.startAmbientEffects();
        console.log('🌟 Manas AI Wellness Companion (Ethereal UI) initialized');
    }
    
    async apiCall(endpoint, method = 'POST', body = null) {
        try {
            const options = { method, headers: {} };
            if (body) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown API error' }));
                throw new Error(errorData.detail);
            }
            const contentType = response.headers.get("content-type");
            if (contentType?.includes("application/json")) return response.json();
            if (contentType?.includes("audio/wav")) return response.blob();
            return response.text();
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            this.showToast('An error occurred. Is the backend running?');
            throw error;
        }
    }
    
    bindStaticEvents() {
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        document.getElementById('login-name-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.login(); });
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.querySelectorAll('.orb-container').forEach(orb => {
            orb.addEventListener('click', () => this.openFeature(orb.dataset.feature));
        });
    }

    login() {
        const nameInput = document.getElementById('login-name-input');
        this.userName = nameInput.value.trim() || 'Friend';
        document.getElementById('welcome-message').textContent = `Welcome, ${this.userName}`;
        const loginScreen = document.getElementById('login-screen');
        const appScreen = document.getElementById('main-app');
        loginScreen.classList.add('fade-out');
        setTimeout(() => {
            loginScreen.style.display = 'none';
            appScreen.style.display = 'flex';
            appScreen.classList.add('fade-in');
            this.updateStats();
            this.setDailyQuote();
            this.addXP(25);
        }, 500);
    }
    
    openFeature(featureId) {
        const feature = this.features[featureId];
        if (!feature) return;
        this.showModal(feature.title, this.getFeatureContent(featureId));
        this.addXP(10);
    }
    
    showModal(title, content) {
        const modal = document.getElementById('feature-modal');
        const modalBody = document.getElementById('modal-body');
        document.getElementById('modal-title').textContent = title;
        modalBody.innerHTML = content;
        modal.style.display = 'flex';
        modal.classList.remove('fade-out');
        modal.classList.add('fade-in');
        
        modalBody.onclick = (event) => this.handleModalClick(event);

        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            const initialMessage = `Hello ${this.userName}! I'm Nuru. How can I help you on your wellness journey today?`;
            this.displayMessage(initialMessage, 'ai');
            this.chatHistory = [{ role: 'model', parts: [{ text: initialMessage }] }];
            
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendChatMessage();
                }
            });
        }
    }

    closeModal() {
        if (this.breathingActive) this.stopBreathingExercise(false);
        if (this.meditationActive) this.endMeditation(false);
        if (this.detoxActive) this.endDetox(true, false);
        const modal = document.getElementById('feature-modal');
        modal.classList.remove('fade-in');
        modal.classList.add('fade-out');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }

    showToast(message) {
        const toast = document.getElementById('toast-notification');
        toast.textContent = message;
        toast.style.display = 'block';
        toast.classList.remove('fade-out');
        toast.classList.add('fade-in');
        setTimeout(() => {
            toast.classList.remove('fade-in');
            toast.classList.add('fade-out');
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 3000);
    }

    getFeatureContent(featureId) {
        switch (featureId) {
            case 'chat': return `<div class="chat-container"><div class="chat-messages" id="chat-messages"></div><div class="chat-input-container"><input type="text" class="chat-input" id="chat-input" placeholder="Share your thoughts..."><button class="primary-btn" id="chat-send-btn">Send</button></div></div>`;
            case 'mood': const moodButtons = this.moodOptions.map(m => `<div class="mood-btn" data-mood="${m.name}"><div>${m.emoji}</div><div style="font-size: 0.8rem; margin-top: 5px;">${m.name}</div></div>`).join(''); return `<div class="mood-logger"><h3>How are you feeling?</h3><div class="mood-options">${moodButtons}</div></div>`;
            case 'goal': return `<div class="goal-coach"><h3>What goal would you like to achieve?</h3><input type="text" id="goal-input" placeholder="e.g., practice mindfulness daily..."><button id="generate-goal-plan" class="primary-btn">Create Action Plan</button><div id="goal-plan" style="margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 10px; display: none; white-space: pre-wrap;"></div></div>`;
            case 'breathe': const patternButtons = this.breathingPatterns.map((p, i) => `<button class="breathing-pattern-btn" data-pattern="${i}">${p.name}</button>`).join(''); return `<div class="breathing-container"><div class="breathing-patterns" id="breathing-patterns">${patternButtons}</div><div class="breathing-exercise" id="breathing-exercise" style="display: none;"><div class="breathing-orb" id="breathing-orb"><div class="breathing-text" id="breathing-text"></div></div><button id="stop-breathing" class="primary-btn">Stop</button></div></div>`;
            case 'zones': return `<div class="safe-zones"><h3>Find Safe Spaces Near You</h3><button id="find-safe-zones" class="primary-btn">Find Nearby</button><div id="safe-zones-results" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 10px;"></div></div>`;
            case 'schedule': return `<div class="scheduler"><h3>Smart Scheduling</h3><label>Reminder Type:</label><select id="reminder-type"><option>Daily Meditation</option><option>Mood Check-in</option></select><label>Time:</label><input type="time" id="reminder-time"><button id="set-reminder" class="primary-btn">Set Reminder</button></div>`;
            case 'wisdom': return `<div class="wisdom-stone"><h3>Ask the Wisdom Stone</h3><input type="text" id="wisdom-question" placeholder="Ask a question..."><button id="ask-wisdom" class="primary-btn">Seek Wisdom</button><div id="wisdom-response" style="margin-top: 1rem; text-align: center; font-style: italic; color: var(--text-secondary);"></div></div>`;
            case 'cave': return `<div class="echo-cave"><h3>Echo Cave Soundscapes</h3><input type="text" id="soundscape-word" placeholder="Enter a word (e.g., peace, forest)"><button id="generate-soundscape" class="primary-btn">Generate Soundscape</button><div id="soundscape-result" style="margin-top: 1rem;"></div></div>`;
            case 'poem': return `<div class="poem-generator"><h3>A Poem for Your Mood</h3><p style="text-align: center; margin-bottom: 1rem; color: var(--text-secondary);">Generating a poem based on your feeling of: <strong>${this.currentMood}</strong></p><button id="generate-poem" class="primary-btn">✨ Generate My Poem</button><div id="poem-result" style="margin-top: 1rem; white-space: pre-wrap; background: rgba(0,0,0,0.2); border-radius: 10px; padding: 1rem; display: none; color: var(--text-secondary);"></div></div>`;
            case 'meditation': return `<div class="meditation-guide"><h3>Guided Meditation</h3><div id="meditation-options"><label>Topic:</label><select id="meditation-topic"><option value="stress-relief">Stress Relief</option><option value="focus">Focus</option><option value="sleep">Sleep Prep</option></select><label>Duration:</label><select id="meditation-duration"><option value="5">5 minutes</option><option value="10">10 minutes</option></select><button id="start-meditation" class="primary-btn">Begin Meditation</button></div><div id="meditation-session" style="display: none; text-align: center;"><div id="meditation-time" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary-glow);"></div><div id="meditation-script" style="max-height: 200px; overflow-y: auto; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 10px; color: var(--text-secondary);"></div></div></div>`;
            case 'detox': return `<div class="digital-detox"><h3>Digital Detox</h3><div id="detox-setup"><label>Duration:</label><select id="detox-duration"><option value="30">30 minutes</option><option value="60">1 hour</option></select><button id="start-detox" class="primary-btn">Start Detox</button></div><div id="detox-session" style="display: none; text-align: center;"><p id="detox-pledge" style="font-style: italic; color: var(--text-secondary);"></p><div id="detox-time" style="font-size: 2.5rem; margin: 1rem 0; color: var(--primary-glow);"></div><button id="end-detox" class="primary-btn">End Early</button></div></div>`;
            default: return '<p>Feature coming soon...</p>';
        }
    }
    
    handleModalClick(event) {
        const button = event.target.closest('button');
        const moodBtn = event.target.closest('.mood-btn');
        const breathingPatternBtn = event.target.closest('.breathing-pattern-btn');

        if (moodBtn) { this.logMood(moodBtn); return; }
        if (breathingPatternBtn) { this.startBreathingExercise(breathingPatternBtn.dataset.pattern); return; }

        if (button) {
            switch(button.id) {
                case 'chat-send-btn': this.sendChatMessage(); break;
                case 'generate-goal-plan': this.generateGoalPlan(); break;
                case 'stop-breathing': this.stopBreathingExercise(true); break;
                case 'find-safe-zones': this.findSafeZones(); break;
                case 'set-reminder': this.setReminder(); break;
                case 'ask-wisdom': this.askWisdom(); break;
                case 'generate-soundscape': this.generateSoundscape(); break;
                case 'generate-poem': this.generatePoem(); break;
                case 'start-meditation': this.startMeditation(); break;
                case 'start-detox': this.startDetox(); break;
                case 'end-detox': this.endDetox(true, true); break;
            }
        }
    }

    async sendChatMessage() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        const message = input.value.trim();
        if (!message) return;
        this.displayMessage(message, 'user');
        this.chatHistory.push({ role: 'user', parts: [{ text: message }] });
        input.value = '';
        sendBtn.disabled = true;
        try {
            const response = await this.apiCall('/api/chat', 'POST', { history: this.chatHistory });
            this.displayMessage(response.text, 'ai');
            this.chatHistory.push({ role: 'model', parts: [{ text: response.text }] });
            this.addXP(5);
        } catch (error) {
            this.displayMessage("I'm having a little trouble connecting. Let's try again in a moment.", 'ai');
        } finally {
            sendBtn.disabled = false;
        }
    }
    displayMessage(text, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${type}`;
        messageEl.innerHTML = `<span>${text}</span>`;
        if (messagesContainer) {
            messagesContainer.appendChild(messageEl);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    logMood(moodBtn) {
        this.currentMood = moodBtn.dataset.mood;
        document.getElementById('current-mood-text').textContent = this.currentMood;
        this.showToast(`Mood logged: ${this.currentMood}`);
        this.addXP(15);
        this.closeModal();
    }
    async generateGoalPlan() {
        const goalInput = document.getElementById('goal-input');
        const planDiv = document.getElementById('goal-plan');
        const goal = goalInput.value.trim();
        const generateBtn = document.getElementById('generate-goal-plan');
        if (!goal) { this.showToast('Please enter a goal first! ✨'); return; }
        generateBtn.disabled = true;
        generateBtn.textContent = 'Crafting your plan...';
        planDiv.style.display = 'block';
        planDiv.innerHTML = '<p>Loading...</p>';
        try {
            const response = await this.apiCall('/api/coach-goal', 'POST', { goal });
            planDiv.innerHTML = response.plan;
            this.addXP(25);
        } catch (error) {
            planDiv.innerHTML = '<p>Could not create a plan. Please try again.</p>';
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Create Action Plan';
        }
    }
    startBreathingExercise(patternIndex) {
        if (this.breathingActive) return;
        this.breathingActive = true;
        const pattern = this.breathingPatterns[patternIndex];
        document.getElementById('breathing-patterns').style.display = 'none';
        const exerciseDiv = document.getElementById('breathing-exercise');
        exerciseDiv.style.display = 'flex';
        exerciseDiv.style.flexDirection = 'column';
        exerciseDiv.style.alignItems = 'center';
        const orb = document.getElementById('breathing-orb');
        const text = document.getElementById('breathing-text');
        let phase = 'prepare';
        let countdown = 4;
        const cycle = () => {
            if (!this.breathingActive) { clearInterval(this.breathingInterval); return; }
            countdown--;
            text.textContent = `${phase}... ${countdown}`;
            if (countdown <= 0) {
                switch (phase) {
                    case 'prepare': phase = 'inhale'; countdown = pattern.inhale; orb.classList.add('inhale'); break;
                    case 'inhale': phase = pattern.hold > 0 ? 'hold' : 'exhale'; countdown = pattern.hold > 0 ? pattern.hold : pattern.exhale; if(phase === 'exhale') { orb.classList.remove('inhale'); orb.classList.add('exhale'); } break;
                    case 'hold': phase = 'exhale'; countdown = pattern.exhale; orb.classList.remove('inhale'); orb.classList.add('exhale'); break;
                    case 'exhale': phase = pattern.pause > 0 ? 'pause' : 'inhale'; countdown = pattern.pause > 0 ? pattern.pause : pattern.inhale; if(phase === 'inhale') { orb.classList.remove('exhale'); orb.classList.add('inhale'); } break;
                    case 'pause': phase = 'inhale'; countdown = pattern.inhale; orb.classList.add('inhale'); break;
                }
            }
        };
        cycle();
        this.breathingInterval = setInterval(cycle, 1000);
    }
    stopBreathingExercise(giveXP = true) {
        if (!this.breathingActive) return;
        this.breathingActive = false;
        clearInterval(this.breathingInterval);
        if (giveXP) { this.addXP(20); this.showToast('Great session! 🌟'); }
        this.closeModal();
    }
    async findSafeZones() {
        const resultsDiv = document.getElementById('safe-zones-results');
        resultsDiv.innerHTML = '<p>Getting your location...</p>';
        if (!navigator.geolocation) {
            resultsDiv.innerHTML = '<p style="color: #ff8a8a;">Geolocation is not supported by your browser.</p>';
            return;
        }
        navigator.geolocation.getCurrentPosition(async (pos) => {
            resultsDiv.innerHTML = '<p>Searching for safe zones...</p>';
            try {
                const { latitude, longitude } = pos.coords;
                const data = await this.apiCall('/api/safe-zones', 'POST', { latitude, longitude });
                if (data.places && data.places.length > 0) {
                    resultsDiv.innerHTML = data.places.map(p => `<div class="glass-ui" style="padding:10px; border-radius: 12px;"><h4 style="color:var(--accent-glow); margin-bottom: 4px;">${p.name}</h4><p style="font-size:0.8rem;color:var(--text-secondary); margin:0;">${p.type} - ${p.vicinity}</p></div>`).join('');
                } else {
                    resultsDiv.innerHTML = '<p>No specific safe zones found nearby. Consider a local park or library.</p>';
                }
            } catch (e) {
                resultsDiv.innerHTML = '<p style="color: #ff8a8a;">Could not find safe zones. Please check your connection and try again.</p>';
            }
        }, (error) => {
            if (error.code === error.PERMISSION_DENIED) {
                resultsDiv.innerHTML = '<p style="color: #ff8a8a;">Location access was denied. Please enable it in your browser settings to use this feature.</p>';
            } else {
                resultsDiv.innerHTML = '<p style="color: #ff8a8a;">Could not get your location. Please ensure location services are enabled on your device.</p>';
            }
        });
    }
    setReminder() {
        const time = document.getElementById('reminder-time').value;
        if (!time) { this.showToast('Please select a time!'); return; }
        this.showToast(`Reminder set for ${time} 🔔`);
        this.addXP(10);
        this.closeModal();
    }
    async askWisdom() {
        const question = document.getElementById('wisdom-question').value;
        const responseDiv = document.getElementById('wisdom-response');
        if (!question) { this.showToast('Please ask a question.'); return; }
        responseDiv.textContent = 'The stone is pondering...';
        try {
            const response = await this.apiCall('/api/get-wisdom-riddle', 'POST', { question });
            responseDiv.textContent = `"${response.riddle}"`;
        } catch (e) {
            responseDiv.textContent = 'The stone is quiet right now.';
        }
    }
    async generateSoundscape() {
        const word = document.getElementById('soundscape-word').value;
        const resultDiv = document.getElementById('soundscape-result');
        const generateBtn = document.getElementById('generate-soundscape');
        if (!word) { this.showToast('Please enter a word.'); return; }
        generateBtn.disabled = true;
        generateBtn.textContent = 'Composing...';
        resultDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">The Echo Cave is gathering sounds...<br><small>This can take up to a minute on some devices.</small></p>';
        try {
            const audioBlob = await this.apiCall('/api/generate-soundscape', 'POST', { word });
            const audioUrl = URL.createObjectURL(audioBlob);
            resultDiv.innerHTML = `<audio controls autoplay style="width:100%;"><source src="${audioUrl}" type="audio/wav"></audio>`;
        } catch (e) {
            resultDiv.innerHTML = '<p style="text-align: center; color: #ff8a8a;">The cave is silent. Please try another word.</p>';
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Soundscape';
        }
    }
    async generatePoem() {
        const resultDiv = document.getElementById('poem-result');
        const generateBtn = document.getElementById('generate-poem');
        generateBtn.disabled = true;
        generateBtn.textContent = 'Writing...';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<p>Gathering words...</p>';
        try {
            const prompt = `Write a short, soothing, and inspirational poem about the feeling of being ${this.currentMood}.`;
            const response = await this.apiCall('/api/generate-poem', 'POST', { prompt });
            resultDiv.innerHTML = response.poem;
        } catch (error) {
            resultDiv.innerHTML = '<p>The muse is quiet.</p>';
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = '✨ Regenerate';
        }
    }
    async startMeditation() {
        if (this.meditationActive) return;
        this.meditationActive = true;
        const topic = document.getElementById('meditation-topic').value;
        const duration = document.getElementById('meditation-duration').value;
        document.getElementById('meditation-options').style.display = 'none';
        const sessionDiv = document.getElementById('meditation-session');
        sessionDiv.style.display = 'block';
        const scriptDiv = document.getElementById('meditation-script');
        scriptDiv.innerHTML = '<p>Loading your meditation script...</p>';
        try {
            const response = await this.apiCall('/api/generate-meditation', 'POST', { topic, duration: `${duration} minutes` });
            scriptDiv.innerHTML = `<p>${response.script.replace(/\[PAUSE\]/g, '<br><br><em>(pause)</em><br><br>').replace(/\n/g, '<br>')}</p>`;
            this.meditationTimeLeft = parseInt(duration) * 60;
            this.updateMeditationTimer();
            this.meditationInterval = setInterval(() => this.updateMeditationTimer(), 1000);
        } catch (error) {
            scriptDiv.innerHTML = '<p>Could not load script. Please try again.</p>';
        }
    }
    updateMeditationTimer() {
        if (!this.meditationActive) return;
        const timerDisplay = document.getElementById('meditation-time');
        const minutes = Math.floor(this.meditationTimeLeft / 60).toString().padStart(2, '0');
        const seconds = (this.meditationTimeLeft % 60).toString().padStart(2, '0');
        if(timerDisplay) timerDisplay.textContent = `${minutes}:${seconds}`;
        if (this.meditationTimeLeft > 0) this.meditationTimeLeft--;
        else this.endMeditation(true);
    }
    endMeditation(giveXP = true) {
        if (!this.meditationActive) return;
        clearInterval(this.meditationInterval);
        this.meditationActive = false;
        if (giveXP) {
            this.addXP(30);
            this.showToast('Meditation complete! Well done! 🌟');
        }
        this.closeModal();
    }
    async startDetox() {
        if (this.detoxActive) return;
        this.detoxActive = true;
        const duration = document.getElementById('detox-duration').value;
        document.getElementById('detox-setup').style.display = 'none';
        const sessionDiv = document.getElementById('detox-session');
        sessionDiv.style.display = 'block';
        const pledgeEl = document.getElementById('detox-pledge');
        pledgeEl.textContent = "Crafting your intention...";
        try {
            const response = await this.apiCall('/api/generate-detox-pledge', 'POST', { name: this.userName, duration: `${duration} minutes` });
            pledgeEl.textContent = response.pledge;
        } catch (error) {
            pledgeEl.textContent = "I will use this time to connect with myself.";
        }
        this.detoxTimeLeft = parseInt(duration) * 60;
        this.updateDetoxTimer();
        this.detoxInterval = setInterval(() => this.updateDetoxTimer(), 1000);
    }
    updateDetoxTimer() {
        if (!this.detoxActive) return;
        const timerDisplay = document.getElementById('detox-time');
        if (timerDisplay) {
            const hours = Math.floor(this.detoxTimeLeft / 3600).toString().padStart(2, '0');
            const minutes = Math.floor((this.detoxTimeLeft % 3600) / 60).toString().padStart(2, '0');
            const seconds = (this.detoxTimeLeft % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        }
        if (this.detoxTimeLeft > 0) this.detoxTimeLeft--;
        else this.endDetox(false, true);
    }
    async endDetox(early = false, giveXP = true) {
        if (!this.detoxActive) return;
        clearInterval(this.detoxInterval);
        this.detoxActive = false;
        if (early) {
            if (giveXP) this.showToast('Detox ended. Every moment counts! 🌟');
            this.closeModal();
        } else {
            if (giveXP) { this.addXP(50); this.showToast('Detox complete! 🎉'); }
            const sessionDiv = document.getElementById('detox-session');
            const completionMessage = await this.apiCall('/api/generate-detox-completion').catch(() => ({ message: 'You did it! Welcome back.' }));
            if (sessionDiv) sessionDiv.innerHTML = `<h3 style="color:var(--accent-glow)">🎉 Detox Complete!</h3><p>${completionMessage.message}</p>`;
        }
    }
    addXP(amount) {
        this.userXP += amount;
        if (this.userXP >= this.maxXP) this.levelUp();
        this.updateStats();
    }
    levelUp() {
        this.userLevel++;
        this.userXP -= this.maxXP;
        this.maxXP = Math.floor(this.maxXP * 1.5);
        this.showToast(`🎉 Level Up! You're now Level ${this.userLevel}!`);
    }
    updateStats() {
        document.getElementById('user-level').textContent = this.userLevel;
        document.getElementById('xp-text').textContent = `${this.userXP}/${this.maxXP} XP`;
        const xpPercentage = (this.userXP / this.maxXP) * 100;
        document.getElementById('xp-progress').style.width = `${xpPercentage}%`;
    }
    setDailyQuote() {
        const quote = this.dailyQuotes[Math.floor(Math.random() * this.dailyQuotes.length)];
        document.getElementById('daily-quote').textContent = `"${quote}"`;
    }
    startAmbientEffects() {
        this.createTwinklingStars(100);
        this.startShootingStars(5000);
        this.initParallax();
    }
    createTwinklingStars(count) {
        const container = document.querySelector('.stars-container');
        if (!container) return;
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.classList.add('star');
            const size = Math.random() * 2 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 5}s`;
            star.style.animationDuration = `${Math.random() * 3 + 2}s`;
            container.appendChild(star);
        }
    }
    startShootingStars(interval) {
        setInterval(() => {
            if (Math.random() > 0.7) {
                const comet = document.createElement('div');
                comet.classList.add('comet');
                comet.style.top = `${Math.random() * 40}%`;
                comet.style.left = `${Math.random() * 100}%`;
                const duration = Math.random() * 3 + 2;
                comet.style.animationDuration = `${duration}s`;
                document.body.appendChild(comet);
                setTimeout(() => { comet.remove(); }, duration * 1000);
            }
        }, interval);
    }
    initParallax() {
        this.auroraShapes = document.querySelectorAll('.aurora-shape');
        window.addEventListener('mousemove', (e) => this.handleParallax(e));
    }
    handleParallax(e) {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const mouseX = (clientX / innerWidth - 0.5) * 2;
        const mouseY = (clientY / innerHeight - 0.5) * 2;
        this.auroraShapes.forEach((shape, index) => {
            const factor = (index + 1) * 10;
            const dx = -mouseX * factor;
            const dy = -mouseY * factor;
            shape.style.transform = `translate(${dx}px, ${dy}px)`;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => { window.manasApp = new ManasApp(); });