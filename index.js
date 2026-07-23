// ============================================================
// Kink Reminder v3.2 – для мобильных устройств
// ============================================================

import { getContext, sendMessage, eventSource, event_types } from "../../../extensions.js";

console.log('[KinkReminder] Загрузка...');

// ---------- ВСПОМОГАТЕЛЬНЫЕ ----------
function notify(msg) {
    // Показываем в специальном блоке или alert
    const el = document.getElementById('kr-status');
    if (el) { el.textContent = '📢 ' + msg; }
    else { alert(msg); }
}

function getCharacter() {
    const context = getContext();
    if (!context) return null;
    return context.characters[context.characterId] || null;
}

function getCharacterKey() {
    const char = getCharacter();
    return char?.avatar || char?.name || 'unknown';
}

// ---------- ПАРСИНГ КИНКОВ ----------
function extractKinksFromText(text) {
    if (!text) return [];
    const results = [];
    const markers = [
        /\[ooc:.*?kinks.*?\]/i,
        /\[ooc:.*?preferences.*?\]/i,
        /sexual kinks and preferences:/i,
        /kinks:/i,
        /preferences:/i,
        /fetishes:/i,
        /turn-ons:/i,
        /likes \(sexual\):/i,
        /likes:/i,
    ];
    const lines = text.split(/\n/);
    let inside = false;
    let buffer = [];
    for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        if (markers.some(m => m.test(l))) { inside = true; continue; }
        if (inside) {
            if (/^(personality|scenario|description|first message|system|ooc|\[)/i.test(l)) {
                inside = false;
                if (buffer.length) { results.push(...buffer); buffer = []; }
                continue;
            }
            const cleaned = l.replace(/^[\s]*[-•*•]\s+/, '').trim();
            if (cleaned.length > 0 && cleaned.length < 60) buffer.push(cleaned);
            else if (cleaned.length > 60) {
                inside = false;
                if (buffer.length) { results.push(...buffer); buffer = []; }
            }
        }
    }
    if (buffer.length) results.push(...buffer);
    if (results.length === 0) {
        const commaMatch = text.match(/(?:kinks|preferences|fetishes|turn-ons)[\s:]+([^.]*)/i);
        if (commaMatch) {
            const items = commaMatch[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
            if (items.length) return items;
        }
        const keywords = ['bondage','bdsm','spanking','anal','rough','choking','degradation','orgasm control','dirty talk','public','exhibition','roleplay','sensory deprivation','impact play','knife play','blood play','breath play','pet play','age play','incest','breeding','cuckold','femdom','maledom','switch','submission','dominance'];
        const found = [];
        const lower = text.toLowerCase();
        for (const kw of keywords) if (lower.includes(kw)) found.push(kw);
        return [...new Set(found)];
    }
    return [...new Set(results.filter(k => k.length > 0))];
}

function scanCharacterKinks() {
    const character = getCharacter();
    if (!character) return [];
    let kinks = [];
    if (Array.isArray(character.kinks)) kinks = character.kinks;
    else if (typeof character.kinks === 'string') kinks = character.kinks.split(/[,;\n•]+/).map(s=>s.trim()).filter(s=>s.length);
    if (kinks.length) return kinks;
    const fullText = `${character.description||''} ${character.personality||''} ${character.scenario||''} ${character.first_mes||''} ${character.system_prompt||''}`;
    return extractKinksFromText(fullText);
}

// ---------- СОСТОЯНИЕ ----------
let settings = JSON.parse(localStorage.getItem('kink_reminder_settings')) || { floatingButton: true, autoLust: true, lustIncrement: 5, lustInterval: 30000 };
let currentLust = 0;
let lustTimer = null;
let lastKinkResult = null;

function saveSettings() { localStorage.setItem('kink_reminder_settings', JSON.stringify(settings)); }
function saveLust() { localStorage.setItem('lust_vne_'+getCharacterKey(), String(currentLust)); }
function loadLust() { const s = localStorage.getItem('lust_vne_'+getCharacterKey()); currentLust = s ? parseFloat(s) : 0; }

// ---------- АВТО-ПОХОТЬ ----------
function updateLust() {
    if (!settings.autoLust) return;
    const context = getContext();
    if (!context) return;
    const chat = context.chat || [];
    if (!chat.length) return;
    const text = (chat[chat.length-1]?.mes || '').toLowerCase();
    const pos = ['страстно','возбуждающе','горячо','нежно','сильно','глубоко'];
    const neg = ['холодно','равнодушно','скучно','резко','грубо'];
    let delta = 0;
    for (const w of pos) if (text.includes(w)) { delta += settings.lustIncrement; break; }
    for (const w of neg) if (text.includes(w)) { delta -= settings.lustIncrement; break; }
    delta += Math.floor(Math.random()*7)-3;
    if (Math.abs(delta)<3) delta = Math.random()>0.5 ? 2 : -2;
    currentLust = Math.min(100, Math.max(0, currentLust + delta));
    updateLustUI();
    saveLust();
}

function updateLustUI() {
    const r = document.getElementById('kr-lust-range');
    const v = document.getElementById('kr-lust-val');
    if (r) r.value = currentLust;
    if (v) v.textContent = Math.round(currentLust)+'%';
}

// ---------- РУЛЕТКА ----------
function rollKink() {
    const kinks = scanCharacterKinks();
    const res = document.getElementById('kr-roulette-result');
    if (!kinks || !kinks.length) { if(res) res.textContent='❌ Нет кинков'; notify('Нет кинков'); return; }
    let cnt = 0;
    const interval = setInterval(() => {
        const tmp = kinks[Math.floor(Math.random()*kinks.length)];
        if(res) res.textContent = `🎲 ${tmp}...`;
        cnt++;
        if(cnt>6) {
            clearInterval(interval);
            const final = kinks[Math.floor(Math.random()*kinks.length)];
            let result = `🔥 Импульс: ${final}`;
            if(Math.random()>0.7 && kinks.length>1) {
                let second = kinks[Math.floor(Math.random()*kinks.length)];
                if(second !== final) result += ` + ${second}`;
            }
            lastKinkResult = result;
            if(res) res.textContent = result;
            notify('Рулетка определила импульс!');
            localStorage.setItem('kr_last_kink_'+getCharacterKey(), result);
        }
    }, 80);
}

function loadLastKink() {
    const saved = localStorage.getItem('kr_last_kink_'+getCharacterKey());
    if(saved) { lastKinkResult = saved; const el=document.getElementById('kr-roulette-result'); if(el) el.textContent=saved; }
}

function sendKinkToChat() {
    if(!lastKinkResult) { notify('Сначала запустите рулетку'); return; }
    const context = getContext();
    if(context && context.sendMessage) {
        context.sendMessage(lastKinkResult, true);
        notify('Импульс отправлен в чат!');
    } else {
        navigator.clipboard.writeText(lastKinkResult).then(()=>notify('Скопировано в буфер'));
    }
}

// ---------- СОЗДАНИЕ ИНТЕРФЕЙСА (всё в одном) ----------
function buildUI() {
    // Стили
    if (!document.getElementById('kr-styles')) {
        const style = document.createElement('style');
        style.id = 'kr-styles';
        style.textContent = `
            #kr-modal { display:none; position:fixed; top:0;left:0;right:0;bottom:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); align-items:center; justify-content:center; z-index:99999; }
            .kr-box { background:#1e2130; color:#e2e4f0; padding:24px; border-radius:20px; max-width:500px; width:90%; max-height:90vh; overflow-y:auto; border:1px solid #2f3455; }
            .kr-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
            .kr-close { cursor:pointer; font-size:24px; color:#a0a3c0; }
            .kr-close:hover { color:#fff; }
            .kr-section { font-weight:500; color:#b0b3d0; margin:16px 0 8px; border-bottom:1px solid #2f3455; padding-bottom:4px; }
            .kr-grid { display:grid; grid-template-columns:1fr 2fr; gap:12px; background:#161a28; padding:12px; border-radius:12px; margin-bottom:6px; }
            .kr-cell { display:flex; flex-direction:column; }
            .kr-label { font-size:12px; color:#888bb0; }
            .kr-value { font-size:16px; font-weight:500; }
            #kr-lust-range { width:100%; accent-color:#ff6b8a; background:transparent; }
            #kr-roulette-result { background:#161a28; padding:12px; border-radius:12px; min-height:44px; font-size:16px; margin-bottom:12px; border:1px solid #2f3455; }
            #kr-kink-text { background:#161a28; border:1px solid #2f3455; border-radius:12px; padding:10px; color:#e2e4f0; width:100%; resize:vertical; font-family:inherit; }
            .kr-btn { background:#2f3455; border:none; color:#e2e4f0; padding:8px 16px; border-radius:20px; cursor:pointer; font-size:14px; transition:0.2s; font-weight:500; }
            .kr-btn:hover { background:#3f4570; transform:scale(0.97); }
            #kr-floating-btn { position:fixed; bottom:20px; right:20px; background:#2f3455; color:#fff; border-radius:50%; width:56px; height:56px; display:flex; align-items:center; justify-content:center; font-size:28px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.5); z-index:9999; user-select:none; border:2px solid #4f5580; }
            #kr-floating-btn:hover { transform:scale(1.08); background:#3f4570; }
            #kr-status { background:#161a28; padding:8px 12px; border-radius:8px; margin-top:8px; font-size:14px; }
        `;
        document.head.appendChild(style);
    }

    // Модальное окно
    if (!document.getElementById('kr-modal')) {
        const modal = document.createElement('div');
        modal.id = 'kr-modal';
        modal.innerHTML = `
            <div class="kr-box">
                <div class="kr-header"><h2>🔞 Kink Engine</h2><span class="kr-close" id="kr-close-modal">✕</span></div>
                <div class="kr-section">📊 Состояние</div>
                <div class="kr-grid">
                    <div class="kr-cell"><div class="kr-label">Персонаж</div><div class="kr-value" id="kr-focus-cell">—</div></div>
                    <div class="kr-cell"><div class="kr-label">Похоть</div><div class="kr-value"><input type="range" id="kr-lust-range" min="0" max="100" value="0" step="1"><span id="kr-lust-val">0%</span></div></div>
                </div>
                <div class="kr-section">🎯 Импульс</div>
                <div id="kr-roulette-result">⏳ Рулетка не запущена</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
                    <button class="kr-btn" id="kr-roll-btn">🎲 Бросить</button>
                    <button class="kr-btn" id="kr-send-btn">📤 Вставить</button>
                </div>
                <div class="kr-section">📋 Карта кинков</div>
                <textarea id="kr-kink-text" rows="4"></textarea>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    <button class="kr-btn" id="kr-scan-btn">🔍 Сканировать</button>
                    <button class="kr-btn" id="kr-save-btn">💾 Сохранить</button>
                </div>
                <div id="kr-status"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Плавающая кнопка
    if (!document.getElementById('kr-floating-btn') && settings.floatingButton) {
        const btn = document.createElement('div');
        btn.id = 'kr-floating-btn';
        btn.textContent = '🔞';
        document.body.appendChild(btn);
        btn.addEventListener('click', openModal);
    }

    // Панель в настройках расширений
    const container = document.getElementById('extensions_settings');
    if (container && !document.getElementById('kr-settings-panel')) {
        const panel = document.createElement('div');
        panel.id = 'kr-settings-panel';
        panel.className = 'inline-drawer';
        panel.innerHTML = `
            <div class="inline-drawer-toggle inline-drawer-header"><b>🔞 Kink Reminder</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div></div>
            <div class="inline-drawer-content">
                <label><input type="checkbox" id="kr-float-toggle" ${settings.floatingButton?'checked':''}> Плавающая кнопка</label>
                <label><input type="checkbox" id="kr-auto-lust-toggle" ${settings.autoLust?'checked':''}> Авто-похоть</label>
                <label>Шаг: <input type="number" id="kr-step-input" value="${settings.lustIncrement}" min="1" max="20"></label>
                <label>Интервал (мс): <input type="number" id="kr-interval-input" value="${settings.lustInterval}" min="5000" step="5000"></label>
                <button class="kr-btn" id="kr-open-modal-btn">Открыть окно</button>
            </div>
        `;
        container.appendChild(panel);

        // Обработчики
        document.getElementById('kr-float-toggle').addEventListener('change', function() {
            settings.floatingButton = this.checked; saveSettings();
            const b = document.getElementById('kr-floating-btn');
            if (settings.floatingButton && !b) {
                const nb = document.createElement('div');
                nb.id = 'kr-floating-btn';
                nb.textContent = '🔞';
                document.body.appendChild(nb);
                nb.addEventListener('click', openModal);
            } else if (!settings.floatingButton && b) b.remove();
        });
        document.getElementById('kr-auto-lust-toggle').addEventListener('change', function() {
            settings.autoLust = this.checked; saveSettings();
            if (settings.autoLust && !lustTimer) lustTimer = setInterval(updateLust, settings.lustInterval);
            else if (!settings.autoLust && lustTimer) { clearInterval(lustTimer); lustTimer = null; }
        });
        document.getElementById('kr-step-input').addEventListener('change', function() {
            settings.lustIncrement = parseInt(this.value) || 5; saveSettings();
        });
        document.getElementById('kr-interval-input').addEventListener('change', function() {
            settings.lustInterval = parseInt(this.value) || 30000; saveSettings();
            if (lustTimer) { clearInterval(lustTimer); lustTimer = setInterval(updateLust, settings.lustInterval); }
        });
        document.getElementById('kr-open-modal-btn').addEventListener('click', openModal);
    }

    // События модалки
    document.getElementById('kr-close-modal')?.addEventListener('click', ()=>document.getElementById('kr-modal').style.display='none');
    document.getElementById('kr-roll-btn')?.addEventListener('click', rollKink);
    document.getElementById('kr-send-btn')?.addEventListener('click', sendKinkToChat);
    document.getElementById('kr-scan-btn')?.addEventListener('click', function() {
        const kinks = scanCharacterKinks();
        const ta = document.getElementById('kr-kink-text');
        if (!kinks || !kinks.length) { ta.value = '❌ Кинки не найдены'; notify('Не найдены'); return; }
        ta.value = kinks.map(k=>'• '+k).join('\n');
        notify(`Найдено ${kinks.length}`);
    });
    document.getElementById('kr-save-btn')?.addEventListener('click', function() {
        localStorage.setItem('kink_vne_'+getCharacterKey(), document.getElementById('kr-kink-text').value);
        this.textContent = '✓ Сохранено';
        setTimeout(()=>this.textContent='💾 Сохранить', 1200);
    });
    document.getElementById('kr-lust-range')?.addEventListener('input', function() {
        currentLust = parseFloat(this.value);
        document.getElementById('kr-lust-val').textContent = Math.round(currentLust)+'%';
        saveLust();
    });
    document.getElementById('kr-modal')?.addEventListener('click', function(e) { if(e.target===this) this.style.display='none'; });
}

function openModal() {
    const char = getCharacter();
    if (!char) { notify('Персонаж не выбран'); return; }
    document.getElementById('kr-focus-cell').textContent = char.name || 'Без имени';
    document.getElementById('kr-kink-text').value = localStorage.getItem('kink_vne_'+getCharacterKey()) || '';
    loadLastKink();
    loadLust();
    updateLustUI();
    document.getElementById('kr-modal').style.display = 'flex';
}

// ---------- ПОДПИСКА НА СООБЩЕНИЯ ----------
eventSource.on(event_types.MESSAGE_RECEIVED, updateLust);
if (settings.autoLust) lustTimer = setInterval(updateLust, settings.lustInterval);

// ---------- ЗАПУСК ----------
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildUI);
else buildUI();

console.log('[KinkReminder] Загружено успешно!');
