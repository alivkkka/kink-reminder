// ============================================================
// Kink Reminder v3.0 – полностью рабочий код с авто-похотью,
// парсингом кинков из карточки и рулеткой.
// ============================================================

import { getContext, sendMessage, eventSource, event_types } from "../../../extensions.js";

console.log('[Kink Reminder] Загрузка расширения...');

jQuery(async () => {
    try {
        console.log('[Kink Reminder] jQuery ready');

        // -------------------- НАСТРОЙКИ --------------------
        const DEFAULT_SETTINGS = {
            floatingButton: true,
            autoScan: true,
            autoLust: true,
            lustIncrement: 5,
            lustInterval: 30000,
        };

        let settings = JSON.parse(localStorage.getItem('kink_reminder_settings')) || DEFAULT_SETTINGS;
        let currentLust = 0;
        let lustTimer = null;
        let lastKinkResult = null;

        function saveSettings() {
            localStorage.setItem('kink_reminder_settings', JSON.stringify(settings));
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

        // -------------------- ПАРСИНГ КИНКОВ --------------------
        function extractKinksFromText(text) {
            if (!text) return [];
            const results = [];

            // Маркеры начала блока
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

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const isMarker = markers.some(m => m.test(line));
                if (isMarker) {
                    inside = true;
                    continue;
                }

                if (inside) {
                    // Если начался новый раздел – выходим
                    const newSection = /^(personality|scenario|description|first message|system|ooc|\[)/i.test(line);
                    if (newSection) {
                        inside = false;
                        if (buffer.length) {
                            results.push(...buffer);
                            buffer = [];
                        }
                        continue;
                    }

                    // Убираем маркеры списка
                    const cleaned = line.replace(/^[\s]*[-•*•]\s+/, '').trim();
                    if (cleaned.length > 0 && cleaned.length < 60) {
                        buffer.push(cleaned);
                    } else if (cleaned.length > 60) {
                        // Длинная строка – скорее описание, прерываем
                        inside = false;
                        if (buffer.length) {
                            results.push(...buffer);
                            buffer = [];
                        }
                    }
                }
            }

            if (buffer.length) results.push(...buffer);

            // Если пусто – пробуем найти через запятую
            if (results.length === 0) {
                const commaMatch = text.match(/(?:kinks|preferences|fetishes|turn-ons)[\s:]+([^.]*)/i);
                if (commaMatch) {
                    const items = commaMatch[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
                    if (items.length) return items;
                }

                // Fallback – список ключевых слов
                const keywords = [
                    'bondage', 'bdsm', 'spanking', 'anal', 'rough', 'choking', 'degradation',
                    'orgasm control', 'dirty talk', 'public', 'exhibition', 'roleplay',
                    'sensory deprivation', 'impact play', 'knife play', 'blood play',
                    'breath play', 'pet play', 'age play', 'incest', 'breeding',
                    'cuckold', 'femdom', 'maledom', 'switch', 'submission', 'dominance'
                ];
                const found = [];
                const lower = text.toLowerCase();
                for (const kw of keywords) {
                    if (lower.includes(kw)) found.push(kw);
                }
                return [...new Set(found)];
            }

            return [...new Set(results.filter(k => k.length > 0))];
        }

        function scanCharacterKinks() {
            const character = getCharacter();
            if (!character) {
                console.warn('[Kink Reminder] Персонаж не выбран');
                return [];
            }

            // Поле kinks
            let kinks = [];
            if (Array.isArray(character.kinks)) {
                kinks = character.kinks;
            } else if (typeof character.kinks === 'string') {
                kinks = character.kinks.split(/[,;\n•]+/).map(s => s.trim()).filter(s => s.length > 0);
            }

            if (kinks.length) {
                console.log('[Kink Reminder] Кинки из поля kinks:', kinks);
                return kinks;
            }

            // Парсим текст карточки
            const fullText = `
                ${character.description || ''}
                ${character.personality || ''}
                ${character.scenario || ''}
                ${character.first_mes || ''}
                ${character.system_prompt || ''}
            `;
            const extracted = extractKinksFromText(fullText);
            if (extracted.length) {
                console.log('[Kink Reminder] Кинки из текста:', extracted);
                return extracted;
            }

            console.warn('[Kink Reminder] Кинки не найдены');
            return [];
        }

        // -------------------- АВТО-ПОХОТЬ --------------------
        function updateLustAutomatically() {
            if (!settings.autoLust) return;

            const context = getContext();
            if (!context) return;
            const chat = context.chat || [];
            if (!chat.length) return;

            const lastMsg = chat[chat.length - 1];
            if (!lastMsg) return;

            const text = (lastMsg.mes || '').toLowerCase();
            const positive = ['страстно', 'возбуждающе', 'горячо', 'нежно', 'сильно', 'глубоко'];
            const negative = ['холодно', 'равнодушно', 'скучно', 'резко', 'грубо'];

            let delta = 0;
            for (const w of positive) {
                if (text.includes(w)) { delta += settings.lustIncrement; break; }
            }
            for (const w of negative) {
                if (text.includes(w)) { delta -= settings.lustIncrement; break; }
            }

            delta += Math.floor(Math.random() * 7) - 3;
            if (Math.abs(delta) < 3) delta = (Math.random() > 0.5 ? 2 : -2);

            currentLust = Math.min(100, Math.max(0, currentLust + delta));
            updateLustUI();
            saveLustToStorage();
        }

        function updateLustUI() {
            $('#kr-lust-range').val(currentLust);
            $('#kr-lust-val').text(Math.round(currentLust) + '%');
        }

        function saveLustToStorage() {
            const key = getCharacterKey();
            localStorage.setItem('lust_vne_' + key, String(currentLust));
        }

        function loadLustFromStorage() {
            const key = getCharacterKey();
            const saved = localStorage.getItem('lust_vne_' + key);
            currentLust = saved ? parseFloat(saved) : 0;
            updateLustUI();
        }

        // -------------------- РУЛЕТКА --------------------
        function rollKink() {
            const kinks = scanCharacterKinks();
            if (!kinks || !kinks.length) {
                $('#kr-roulette-result').text('❌ Нет кинков в карточке');
                return;
            }

            let counter = 0;
            const interval = setInterval(() => {
                const temp = kinks[Math.floor(Math.random() * kinks.length)];
                $('#kr-roulette-result').text(`🎲 ${temp}...`);
                counter++;
                if (counter > 6) {
                    clearInterval(interval);
                    const final = kinks[Math.floor(Math.random() * kinks.length)];
                    let result = `🔥 Импульс: ${final}`;
                    if (Math.random() > 0.7 && kinks.length > 1) {
                        let second = kinks[Math.floor(Math.random() * kinks.length)];
                        if (second !== final) result += ` + ${second}`;
                    }
                    lastKinkResult = result;
                    $('#kr-roulette-result').text(result);
                    toastr.info('Рулетка определила импульс!');

                    const key = getCharacterKey();
                    localStorage.setItem('kr_last_kink_' + key, result);
                }
            }, 80);
        }

        function loadLastKink() {
            const key = getCharacterKey();
            const saved = localStorage.getItem('kr_last_kink_' + key);
            if (saved) {
                lastKinkResult = saved;
                $('#kr-roulette-result').text(saved);
            }
        }

        function sendKinkToChat() {
            if (!lastKinkResult) {
                toastr.warning('Сначала запустите рулетку');
                return;
            }
            const context = getContext();
            if (context && context.sendMessage) {
                context.sendMessage(lastKinkResult, true);
                toastr.success('Импульс отправлен в чат!');
            } else {
                navigator.clipboard.writeText(lastKinkResult).then(() => {
                    toastr.info('Импульс скопирован в буфер');
                });
            }
        }

        // -------------------- ИНТЕРФЕЙС (с CSS) --------------------
        function injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                #kink-reminder-modal {
                    display: none;
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(4px);
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                    font-family: 'Segoe UI', sans-serif;
                }
                .kink-modal-box {
                    background: #1e2130;
                    color: #e2e4f0;
                    padding: 24px 28px;
                    border-radius: 20px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                    border: 1px solid #2f3455;
                }
                .kink-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .kink-modal-header h2 {
                    margin: 0;
                    font-size: 22px;
                    font-weight: 600;
                }
                #close-kink-modal {
                    cursor: pointer;
                    font-size: 24px;
                    color: #a0a3c0;
                    transition: 0.2s;
                }
                #close-kink-modal:hover { color: #fff; }
                .kink-vne-section-title {
                    font-weight: 500;
                    color: #b0b3d0;
                    margin-top: 16px;
                    margin-bottom: 8px;
                    border-bottom: 1px solid #2f3455;
                    padding-bottom: 4px;
                }
                .kink-system-grid {
                    display: grid;
                    grid-template-columns: 1fr 2fr;
                    gap: 12px;
                    background: #161a28;
                    padding: 12px;
                    border-radius: 12px;
                    margin-bottom: 6px;
                }
                .kink-grid-cell {
                    display: flex;
                    flex-direction: column;
                }
                .kink-cell-label {
                    font-size: 12px;
                    color: #888bb0;
                    margin-bottom: 2px;
                }
                .kink-cell-value {
                    font-size: 16px;
                    font-weight: 500;
                }
                #kr-lust-range {
                    width: 100%;
                    accent-color: #ff6b8a;
                    background: transparent;
                }
                #kr-lust-val {
                    display: inline-block;
                    min-width: 40px;
                    text-align: right;
                }
                #kr-roulette-result {
                    background: #161a28;
                    padding: 12px;
                    border-radius: 12px;
                    min-height: 44px;
                    font-size: 16px;
                    margin-bottom: 12px;
                    border: 1px solid #2f3455;
                }
                #kink-modal-text {
                    background: #161a28;
                    border: 1px solid #2f3455;
                    border-radius: 12px;
                    padding: 10px;
                    color: #e2e4f0;
                    width: 100%;
                    resize: vertical;
                    font-family: inherit;
                }
                .menu_button {
                    background: #2f3455;
                    border: none;
                    color: #e2e4f0;
                    padding: 8px 16px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: 0.2s;
                    font-weight: 500;
                }
                .menu_button:hover {
                    background: #3f4570;
                    transform: scale(0.97);
                }
                #kink-floating-btn {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #2f3455;
                    color: #fff;
                    border-radius: 50%;
                    width: 56px;
                    height: 56px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    z-index: 9999;
                    user-select: none;
                    transition: 0.2s;
                    border: 2px solid #4f5580;
                }
                #kink-floating-btn:hover {
                    transform: scale(1.08);
                    background: #3f4570;
                }
            `;
            document.head.appendChild(style);
        }

        function createModal() {
            if ($('#kink-reminder-modal').length) return;
            $('body').append(`
            <div id="kink-reminder-modal">
                <div class="kink-modal-box">
                    <div class="kink-modal-header">
                        <h2>🔞 Kink Engine v3.0</h2>
                        <span id="close-kink-modal">✕</span>
                    </div>

                    <div class="kink-vne-section-title">📊 Состояние</div>
                    <div class="kink-system-grid">
                        <div class="kink-grid-cell">
                            <div class="kink-cell-label">Персонаж</div>
                            <div class="kink-cell-value" id="kr-focus-cell">—</div>
                        </div>
                        <div class="kink-grid-cell">
                            <div class="kink-cell-label">Похоть</div>
                            <div class="kink-cell-value">
                                <input type="range" id="kr-lust-range" min="0" max="100" value="0" step="1">
                                <span id="kr-lust-val">0%</span>
                            </div>
                        </div>
                    </div>

                    <div class="kink-vne-section-title">🎯 Импульс</div>
                    <div id="kr-roulette-result">⏳ Рулетка не запущена</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
                        <button class="menu_button" id="kr-roll-btn">🎲 Бросить кубик</button>
                        <button class="menu_button" id="kr-send-btn">📤 Вставить в чат</button>
                    </div>

                    <div class="kink-vne-section-title">📋 Карта кинков</div>
                    <textarea id="kink-modal-text" rows="4"></textarea>
                    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                        <button class="menu_button" id="scan-kinks-btn">🔍 Сканировать карту</button>
                        <button class="menu_button" id="save-kink-modal">💾 Сохранить</button>
                    </div>
                </div>
            </div>
            `);
        }

        function openModal() {
            const character = getCharacter();
            if (!character) {
                toastr.error('Персонаж не выбран в чате');
                return;
            }

            $('#kr-focus-cell').text(character.name || 'Без имени');

            const key = getCharacterKey();
            const savedKinks = localStorage.getItem('kink_vne_' + key) || '';
            $('#kink-modal-text').val(savedKinks);

            loadLastKink();
            loadLustFromStorage();

            $('#kink-reminder-modal').css('display', 'flex').hide().fadeIn(150);
        }

        // -------------------- ПЛАВАЮЩАЯ КНОПКА --------------------
        function createFloatingButton() {
            if ($('#kink-floating-btn').length) return;
            $('body').append(`<div id="kink-floating-btn">🔞</div>`);
            const btn = document.getElementById('kink-floating-btn');
            btn.addEventListener('click', openModal);

            // Перетаскивание
            let isDragging = false, moved = false, offX = 0, offY = 0;
            btn.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                isDragging = true;
                moved = false;
                const rect = btn.getBoundingClientRect();
                offX = e.clientX - rect.left;
                offY = e.clientY - rect.top;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
                e.preventDefault();
            });
            btn.addEventListener('touchstart', (e) => {
                isDragging = true;
                moved = false;
                const touch = e.touches[0];
                const rect = btn.getBoundingClientRect();
                offX = touch.clientX - rect.left;
                offY = touch.clientY - rect.top;
                document.addEventListener('touchmove', onTouchMove);
                document.addEventListener('touchend', onTouchEnd);
                e.preventDefault();
            });

            function onMove(e) {
                if (!isDragging) return;
                moved = true;
                btn.style.left = (e.clientX - offX) + 'px';
                btn.style.top = (e.clientY - offY) + 'px';
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
            }
            function onUp(e) {
                isDragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                if (!moved) openModal();
            }
            function onTouchMove(e) {
                if (!isDragging) return;
                moved = true;
                const touch = e.touches[0];
                btn.style.left = (touch.clientX - offX) + 'px';
                btn.style.top = (touch.clientY - offY) + 'px';
                btn.style.right = 'auto';
                btn.style.bottom = 'auto';
            }
            function onTouchEnd(e) {
                isDragging = false;
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                if (!moved) openModal();
            }
        }

        function removeFloatingButton() {
            $('#kink-floating-btn').remove();
        }

        function updateFloatingButton() {
            if (settings.floatingButton) createFloatingButton();
            else removeFloatingButton();
        }

        // -------------------- СОБЫТИЯ --------------------
        $(document).on('click', '#close-kink-modal', function () {
            $('#kink-reminder-modal').fadeOut(150);
        });

        $(document).on('input', '#kr-lust-range', function () {
            currentLust = parseFloat(this.value);
            $('#kr-lust-val').text(Math.round(currentLust) + '%');
            saveLustToStorage();
        });

        $(document).on('click', '#save-kink-modal', function () {
            const key = getCharacterKey();
            localStorage.setItem('kink_vne_' + key, $('#kink-modal-text').val());
            $(this).text('✓ Сохранено');
            setTimeout(() => { $(this).text('💾 Сохранить'); }, 1200);
        });

        $(document).on('click', '#scan-kinks-btn', function () {
            const kinks = scanCharacterKinks();
            if (!kinks || !kinks.length) {
                $('#kink-modal-text').val('❌ Кинки не найдены.\nДобавьте поле "kinks" или блок с кинками в карточку.');
                return;
            }
            $('#kink-modal-text').val(kinks.map(k => '• ' + k).join('\n'));
            toastr.success(`Найдено ${kinks.length} кинков!`);
        });

        $(document).on('click', '#kr-roll-btn', rollKink);
        $(document).on('click', '#kr-send-btn', sendKinkToChat);

        // Подписка на новые сообщения
        eventSource.on(event_types.MESSAGE_RECEIVED, () => {
            if (settings.autoLust) updateLustAutomatically();
        });

        if (settings.autoLust) {
            lustTimer = setInterval(updateLustAutomatically, settings.lustInterval);
        }

        // -------------------- НАСТРОЙКИ В ST --------------------
        function addSettingsPanel() {
            const panelHtml = `
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>🔞 Kink Reminder</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label><input type="checkbox" id="kr-floating-toggle" ${settings.floatingButton ? 'checked' : ''}> Плавающая кнопка</label>
                    <label><input type="checkbox" id="kr-auto-lust-toggle" ${settings.autoLust ? 'checked' : ''}> Авто-похоть</label>
                    <label>Шаг похоти: <input type="number" id="kr-lust-step" value="${settings.lustIncrement}" min="1" max="20"></label>
                    <label>Интервал (мс): <input type="number" id="kr-lust-interval" value="${settings.lustInterval}" min="5000" step="5000"></label>
                </div>
            </div>
            `;
            $('#extensions_settings').append(panelHtml);

            $('#kr-floating-toggle').on('change', function () {
                settings.floatingButton = this.checked;
                saveSettings();
                updateFloatingButton();
            });

            $('#kr-auto-lust-toggle').on('change', function () {
                settings.autoLust = this.checked;
                saveSettings();
                if (settings.autoLust) {
                    if (!lustTimer) {
                        lustTimer = setInterval(updateLustAutomatically, settings.lustInterval);
                    }
                } else {
                    if (lustTimer) {
                        clearInterval(lustTimer);
                        lustTimer = null;
                    }
                }
            });

            $('#kr-lust-step').on('change', function () {
                settings.lustIncrement = parseInt(this.value) || 5;
                saveSettings();
            });

            $('#kr-lust-interval').on('change', function () {
                settings.lustInterval = parseInt(this.value) || 30000;
                saveSettings();
                if (lustTimer) {
                    clearInterval(lustTimer);
                    lustTimer = setInterval(updateLustAutomatically, settings.lustInterval);
                }
            });
        }

        // -------------------- ЗАПУСК --------------------
        injectStyles();
        createModal();
        updateFloatingButton();
        addSettingsPanel();

        console.log('[Kink Reminder] Расширение успешно загружено!');

    } catch (e) {
        console.error('[Kink Reminder] Ошибка при загрузке:', e);
        toastr.error('Kink Reminder: ошибка загрузки, смотрите консоль');
    }
});
