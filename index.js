import { getContext, sendMessage, eventSource, event_types } from "../../../extensions.js";

jQuery(async () => {
    const DEFAULT_SETTINGS = {
        floatingButton: true,
        autoScan: true,
        autoLust: true,
        lustIncrement: 5,
        lustInterval: 30000,
    };

    let settings = JSON.parse(localStorage.getItem("kink_reminder_settings")) || DEFAULT_SETTINGS;
    let currentLust = 0;
    let lustTimer = null;
    let lastKinkResult = null;

    // Сохранение настроек
    function saveSettings() {
        localStorage.setItem("kink_reminder_settings", JSON.stringify(settings));
    }

    // Получение текущего персонажа
    function getCharacter() {
        const context = getContext();
        return context.characters[context.characterId];
    }

    function getCharacterKey() {
        const char = getCharacter();
        return char?.avatar || char?.name || "unknown";
    }

    // ---------- НОВАЯ ФУНКЦИЯ ПАРСИНГА КИНКОВ ----------
    function extractKinksFromText(text) {
        if (!text) return [];
        const lower = text.toLowerCase();
        const results = [];

        // Маркеры, обозначающие начало блока с кинками
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
        let insideKinkBlock = false;
        let kinkLines = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Проверяем, является ли строка маркером
            const isMarker = markers.some(m => m.test(line));
            if (isMarker) {
                insideKinkBlock = true;
                continue;
            }

            if (insideKinkBlock) {
                // Если начался новый раздел (например, "Personality:"), выходим из блока
                const newSection = /^(personality|scenario|description|first message|system|ooc|\[)/i.test(line);
                if (newSection) {
                    insideKinkBlock = false;
                    if (kinkLines.length > 0) {
                        results.push(...kinkLines);
                        kinkLines = [];
                    }
                    continue;
                }

                // Строка как пункт списка (маркер - • * 1. и т.д.)
                const listMatch = line.match(/^[\s]*[-•*•]\s+(.*)/);
                if (listMatch) {
                    kinkLines.push(listMatch[1].trim());
                } else {
                    // Если нет маркера, но строка короткая и не похожа на заголовок – возможно, кинк
                    if (line.length < 60 && !/^[A-Z]/.test(line) && !/^[0-9]/.test(line)) {
                        kinkLines.push(line);
                    } else {
                        // Длинная строка – вероятно, описание, прерываем блок
                        insideKinkBlock = false;
                        if (kinkLines.length > 0) {
                            results.push(...kinkLines);
                            kinkLines = [];
                        }
                    }
                }
            }
        }

        // Обработка остатков
        if (kinkLines.length > 0) {
            results.push(...kinkLines);
        }

        // Если ничего не нашли – пробуем найти через запятую
        if (results.length === 0) {
            const commaMatch = text.match(/(?:kinks|preferences|fetishes|turn-ons)[\s:]+([^.]*)/i);
            if (commaMatch) {
                const items = commaMatch[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);
                if (items.length > 0) {
                    return items;
                }
            }

            // Fallback по ключевым словам
            const keywords = [
                'bondage', 'bdsm', 'spanking', 'anal', 'rough', 'choking', 'degradation',
                'orgasm control', 'dirty talk', 'public', 'exhibition', 'roleplay',
                'sensory deprivation', 'impact play', 'knife play', 'blood play',
                'breath play', 'pet play', 'age play', 'incest', 'breeding',
                'cuckold', 'femdom', 'maledom', 'switch', 'submission', 'dominance'
            ];
            const found = [];
            const lowerText = text.toLowerCase();
            for (const kw of keywords) {
                if (lowerText.includes(kw)) found.push(kw);
            }
            return [...new Set(found)];
        }

        return [...new Set(results.filter(k => k.length > 0))];
    }

    function scanCharacterKinks() {
        const character = getCharacter();
        if (!character) {
            toastr.error('Персонаж не выбран');
            return [];
        }

        // 1. Проверяем поле kinks
        let kinks = [];
        if (Array.isArray(character.kinks)) {
            kinks = character.kinks;
        } else if (typeof character.kinks === 'string') {
            kinks = character.kinks.split(/[,;\n•]+/).map(s => s.trim()).filter(s => s.length > 0);
        }

        if (kinks.length > 0) {
            return kinks;
        }

        // 2. Парсим текстовые поля
        const fullText = `
            ${character.description || ''}
            ${character.personality || ''}
            ${character.scenario || ''}
            ${character.first_mes || ''}
            ${character.system_prompt || ''}
        `;

        const extracted = extractKinksFromText(fullText);
        if (extracted.length > 0) {
            return extracted;
        }

        return [];
    }

    // ---------- АВТОМАТИЧЕСКОЕ ОБНОВЛЕНИЕ ПОХОТИ ----------
    function updateLustAutomatically() {
        if (!settings.autoLust) return;

        const context = getContext();
        const chat = context.chat || [];
        if (chat.length === 0) return;

        const lastMsg = chat[chat.length - 1];
        if (!lastMsg) return;

        const text = (lastMsg.mes || '').toLowerCase();
        const positiveWords = ['страстно', 'возбуждающе', 'горячо', 'нежно', 'сильно', 'глубоко'];
        const negativeWords = ['холодно', 'равнодушно', 'скучно', 'резко', 'грубо'];

        let delta = 0;
        for (const word of positiveWords) {
            if (text.includes(word)) { delta += settings.lustIncrement; break; }
        }
        for (const word of negativeWords) {
            if (text.includes(word)) { delta -= settings.lustIncrement; break; }
        }

        delta += Math.floor(Math.random() * 7) - 3;

        let newLust = Math.min(100, Math.max(0, currentLust + delta));
        if (Math.abs(delta) < 3) {
            newLust = Math.min(100, Math.max(0, currentLust + (Math.random() > 0.5 ? 2 : -2)));
        }

        currentLust = newLust;
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

    // ---------- РУЛЕТКА С СОХРАНЕНИЕМ ----------
    function rollKink() {
        const kinks = scanCharacterKinks();
        if (!kinks || kinks.length === 0) {
            $('#kr-roulette-result').text('❌ Нет кинков в карточке персонажа');
            return;
        }

        let counter = 0;
        const interval = setInterval(() => {
            const temp = kinks[Math.floor(Math.random() * kinks.length)];
            $('#kr-roulette-result').text(`🎲 ${temp}...`);
            counter++;
            if (counter > 6) {
                clearInterval(interval);
                const finalKink = kinks[Math.floor(Math.random() * kinks.length)];
                let result = `🔥 Импульс: ${finalKink}`;
                if (Math.random() > 0.7 && kinks.length > 1) {
                    let second = kinks[Math.floor(Math.random() * kinks.length)];
                    if (second !== finalKink) {
                        result += ` + ${second}`;
                    }
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

    // ---------- ОТПРАВКА В ЧАТ ----------
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
                toastr.info('Импульс скопирован в буфер. Вставьте в чат.');
            });
        }
    }

    // ---------- ИНТЕРФЕЙС ----------
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
                <div id="kr-roulette-result" style="background:#1c2038;padding:10px;border-radius:12px;margin-bottom:10px;min-height:40px;">
                    ⏳ Рулетка не запущена
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
                    <button id="kr-roll-btn" class="menu_button">🎲 Бросить кубик</button>
                    <button id="kr-send-btn" class="menu_button">📤 Вставить в чат</button>
                </div>

                <div class="kink-vne-section-title">📋 Карта кинков</div>
                <textarea id="kink-modal-text" rows="4" style="width:100%;background:#1c2038;border:1px solid #252a4a;border-radius:12px;padding:10px;color:#e2e4f0;resize:vertical;"></textarea>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    <button id="scan-kinks-btn" class="menu_button">🔍 Сканировать карту</button>
                    <button id="save-kink-modal" class="menu_button">💾 Сохранить</button>
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

        $('#kr-focus-cell').text(character.name);

        const key = getCharacterKey();
        const savedKinks = localStorage.getItem('kink_vne_' + key) || '';
        $('#kink-modal-text').val(savedKinks);

        loadLastKink();
        loadLustFromStorage();

        $('#kink-reminder-modal').css('display', 'flex').hide().fadeIn(150);
    }

    // ---------- СОБЫТИЯ ----------
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
        if (!kinks || kinks.length === 0) {
            $('#kink-modal-text').val('❌ Кинки не найдены в карточке.\nДобавьте поле "kinks" или блок с кинками.');
            return;
        }
        $('#kink-modal-text').val(kinks.map(k => '• ' + k).join('\n'));
        toastr.success(`Найдено ${kinks.length} кинков!`);
    });

    $(document).on('click', '#kr-roll-btn', rollKink);
    $(document).on('click', '#kr-send-btn', sendKinkToChat);

    // ---------- АВТО-ОБНОВЛЕНИЕ ПО СОБЫТИЯМ ЧАТА ----------
    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        if (settings.autoLust) {
            updateLustAutomatically();
        }
    });

    if (settings.autoLust) {
        lustTimer = setInterval(() => {
            updateLustAutomatically();
        }, settings.lustInterval);
    }

    // ---------- ПЛАВАЮЩАЯ КНОПКА ----------
    function createFloatingButton() {
        if ($('#kink-floating-btn').length) return;
        $('body').append(`<div id="kink-floating-btn">🔞</div>`);
        const btn = document.getElementById('kink-floating-btn');
        const savedX = localStorage.getItem('kr_btn_x');
        const savedY = localStorage.getItem('kr_btn_y');
        btn.style.left = (savedX ? savedX + 'px' : '18px');
        btn.style.top = (savedY ? savedY + 'px' : '220px');

        let isDragging = false, moved = false, offsetX = 0, offsetY = 0;
        btn.addEventListener('touchstart', e => {
            moved = false;
            isDragging = true;
            const touch = e.touches[0];
            offsetX = touch.clientX - btn.offsetLeft;
            offsetY = touch.clientY - btn.offsetTop;
        });
        document.addEventListener('touchmove', e => {
            if (!isDragging) return;
            moved = true;
            const touch = e.touches[0];
            btn.style.left = (touch.clientX - offsetX) + 'px';
            btn.style.top = (touch.clientY - offsetY) + 'px';
        });
        document.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            localStorage.setItem('kr_btn_x', parseInt(btn.style.left));
            localStorage.setItem('kr_btn_y', parseInt(btn.style.top));
            if (!moved) openModal();
        });
        btn.addEventListener('click', openModal);
    }

    function removeFloatingButton() {
        $('#kink-floating-btn').remove();
    }

    function updateFloatingButton() {
        if (settings.floatingButton) createFloatingButton();
        else removeFloatingButton();
    }

    // ---------- ИНИЦИАЛИЗАЦИЯ ----------
    createModal();
    updateFloatingButton();

    // Добавляем панель настроек
    const settingsHtml = `
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
    $('#extensions_settings').append(settingsHtml);

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
});
