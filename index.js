const MODULE_NAME = 'kink-reminder';

let currentKinks = [];
let initialized = false;

/**
 * Получаем контекст SillyTavern современным способом.
 */
function getSTContext() {
    if (typeof SillyTavern === 'undefined' || typeof SillyTavern.getContext !== 'function') {
        console.error('[Love Clinic] SillyTavern.getContext() недоступен.');
        return null;
    }

    return SillyTavern.getContext();
}

/**
 * Экранирование HTML.
 */
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Получаем текст карточки персонажа.
 */
function getCharacterText(character) {
    if (!character) {
        return '';
    }

    const parts = [
        character.description,
        character.personality,
        character.scenario,
        character.first_mes
    ];

    // На случай современных/импортированных карточек
    if (character.data) {
        parts.push(
            character.data.description,
            character.data.personality,
            character.data.scenario,
            character.data.first_mes
        );
    }

    return parts
        .filter(value => typeof value === 'string' && value.trim())
        .join('\n');
}

/**
 * Вытаскиваем кинк-секцию из карточки.
 */
function extractKinks(character) {
    const text = getCharacterText(character);

    if (!text.trim()) {
        return ['Стандартные предпочтения (карта персонажа пуста)'];
    }

    const lines = text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trim());

    const headingRegex =
        /^(?:kinks?|kink\s*list|fetishes?|fetish\s*list|turn[-\s]?ons?|preferences?|likes?|извращения|кинки|фетиши|предпочтения|возбуждает|нравится)\s*:?\s*(.*)$/i;

    const nextSectionRegex =
        /^(?:body|appearance|personality|behavior|behaviour|scenario|background|history|description|appearance|характер|внешность|поведение|сценарий|биография|описание|личность)\s*:?\s*$/i;

    const collected = [];
    let collecting = false;

    for (const line of lines) {
        if (!line) {
            if (collecting && collected.length > 0) {
                // Пустая строка может означать конец секции.
                collecting = false;
            }
            continue;
        }

        const headingMatch = line.match(headingRegex);

        if (headingMatch) {
            collecting = true;

            const inlineValue = headingMatch[1]?.trim();

            if (inlineValue) {
                collected.push(inlineValue);
            }

            continue;
        }

        if (collecting && nextSectionRegex.test(line)) {
            collecting = false;
            continue;
        }

        if (collecting) {
            collected.push(line);
        }
    }

    /*
     * Если секция не нашлась, попробуем найти строки,
     * содержащие очевидные обозначения кинков.
     */
    if (collected.length === 0) {
        const fallback = [];

        for (const line of lines) {
            if (
                /(?:kink|fetish|turn[-\s]?on|кинк|фетиш|предпочтени|извращени)/i.test(line)
            ) {
                const cleaned = line
                    .replace(/^[^:]{0,40}:\s*/i, '')
                    .trim();

                if (cleaned && cleaned.length > 2) {
                    fallback.push(cleaned);
                }
            }
        }

        collected.push(...fallback);
    }

    /*
     * Разбиваем списки вида:
     * Kinks: biting, teasing, praise
     * или
     * - biting
     * - teasing
     */
    const result = [];

    for (const item of collected) {
        const pieces = item
            .replace(/^[-*•]\s*/, '')
            .split(/[,;|]/)
            .map(value => value.trim())
            .filter(value => value.length > 2);

        result.push(...pieces);
    }

    // Убираем дубликаты
    const unique = [...new Set(result)];

    if (unique.length === 0) {
        return ['Стандартные предпочтения (кинки не найдены в карте)'];
    }

    return unique;
}

/**
 * Находим контейнер настроек расширений.
 */
function getExtensionSettingsContainer() {
    const modern = document.querySelector('#extensions_settings2');
    const legacy = document.querySelector('#extensions_settings');

    return modern || legacy || null;
}

/**
 * Создаём кнопку Love Clinic в панели расширений.
 */
function createSettingsPanel() {
    if (document.getElementById('love-clinic-settings')) {
        return;
    }

    const container = getExtensionSettingsContainer();

    if (!container) {
        console.warn('[Love Clinic] Контейнер настроек расширений пока не найден.');
        return false;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'love-clinic-settings';
    wrapper.className = 'kink-reminder-settings';

    wrapper.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>💖 Love Clinic</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>

            <div class="inline-drawer-content">
                <p>
                    Медкарта кинков персонажа и случайный выбор предпочтения.
                </p>

                <button
                    id="love-clinic-open-btn"
                    class="menu_button"
                    type="button">
                    🩺 Открыть медкарту
                </button>
            </div>
        </div>
    `;

    container.appendChild(wrapper);

    wrapper.querySelector('#love-clinic-open-btn')
        ?.addEventListener('click', openKinkReminder);

    return true;
}

/**
 * Создаём плавающую кнопку.
 */
function createFloatingButton() {
    if (document.getElementById('love-clinic-float-btn')) {
        return;
    }

    const button = document.createElement('button');

    button.id = 'love-clinic-float-btn';
    button.type = 'button';
    button.title = 'Love Clinic';
    button.textContent = '🩺';

    button.addEventListener('click', openKinkReminder);

    document.body.appendChild(button);
}

/**
 * Создаём окно медкарты.
 */
function createMedicalCard() {
    let card = document.getElementById('love-clinic-card');

    if (!card) {
        card = document.createElement('div');
        card.id = 'love-clinic-card';

        card.innerHTML = `
            <div class="love-clinic-backdrop"></div>

            <div class="love-clinic-window">
                <div class="love-clinic-header">
                    <h2>🩺 Медицинская карта кинков</h2>

                    <button
                        id="love-clinic-close"
                        type="button"
                        class="love-clinic-close">
                        ×
                    </button>
                </div>

                <div
                    id="love-clinic-list"
                    class="love-clinic-list">
                </div>

                <div class="love-clinic-actions">
                    <button
                        id="love-clinic-roll"
                        type="button"
                        class="menu_button">
                        🎲 Бросить кубик
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(card);

        card.querySelector('.love-clinic-backdrop')
            ?.addEventListener('click', closeMedicalCard);

        card.querySelector('#love-clinic-close')
            ?.addEventListener('click', closeMedicalCard);

        card.querySelector('#love-clinic-roll')
            ?.addEventListener('click', rollKink);
    }

    updateKinkList();

    card.classList.add('open');
}

/**
 * Закрываем медкарту.
 */
function closeMedicalCard() {
    const card = document.getElementById('love-clinic-card');

    if (card) {
        card.classList.remove('open');
    }
}

/**
 * Обновляем список кинков.
 */
function updateKinkList() {
    const container = document.getElementById('love-clinic-list');

    if (!container) {
        return;
    }

    container.innerHTML = '';

    currentKinks.forEach((kink, index) => {
        const item = document.createElement('div');

        item.className = 'love-clinic-kink';
        item.dataset.index = String(index);

        item.textContent = `💊 ${kink}`;

        container.appendChild(item);
    });
}

/**
 * Выбираем случайный кинк.
 */
async function rollKink() {
    if (!currentKinks.length) {
        return;
    }

    const randomIndex = Math.floor(Math.random() * currentKinks.length);
    const randomKink = currentKinks[randomIndex];

    document.querySelectorAll('.love-clinic-kink')
        .forEach(element => element.classList.remove('selected'));

    const selected = document.querySelector(
        `.love-clinic-kink[data-index="${randomIndex}"]`
    );

    selected?.classList.add('selected');

    await sendKinkToChat(randomKink);
}

/**
 * Отправляем результат в чат.
 */
async function sendKinkToChat(kink) {
    const context = getSTContext();

    if (!context) {
        return;
    }

    const messageText =
        `🎲 **Love Clinic:** выпало предпочтение — *${kink}*`;

    /*
     * В разных версиях ST способ добавления сообщения немного отличается.
     * Сначала используем официальный context.addOneMessage().
     */
    if (typeof context.addOneMessage === 'function') {
        const message = {
            name: context.name2 || 'Love Clinic',
            is_user: false,
            is_system: true,
            mes: messageText,
            send_date: Date.now(),
            extra: {}
        };

        await context.addOneMessage(message);

        if (typeof context.saveChat === 'function') {
            await context.saveChat();
        }

        return;
    }

    /*
     * Запасной вариант.
     */
    if (Array.isArray(context.chat)) {
        const message = {
            name: context.name2 || 'Love Clinic',
            is_user: false,
            is_system: true,
            mes: messageText,
            send_date: Date.now(),
            extra: {}
        };

        context.chat.push(message);

        if (typeof context.saveChat === 'function') {
            await context.saveChat();
        }
    }
}

/**
 * Открываем Love Clinic.
 */
function openKinkReminder() {
    const context = getSTContext();

    if (!context) {
        return;
    }

    const character =
        context.characters?.[context.characterId];

    if (!character) {
        if (typeof toastr !== 'undefined') {
            toastr.warning(
                'Сначала выбери персонажа в чате.',
                'Love Clinic'
            );
        }

        return;
    }

    currentKinks = extractKinks(character);

    createMedicalCard();
}

/**
 * Инициализация расширения.
 */
function init() {
    if (initialized) {
        return;
    }

    initialized = true;

    console.log('[Love Clinic] Инициализация...');

    createFloatingButton();

    /*
     * Контейнер расширений может появиться немного позже.
     * Поэтому пробуем несколько раз, но только до появления панели.
     */
    let attempts = 0;

    const settingsTimer = setInterval(() => {
        attempts++;

        if (createSettingsPanel()) {
            clearInterval(settingsTimer);
            return;
        }

        if (attempts >= 30) {
            clearInterval(settingsTimer);

            console.warn(
                '[Love Clinic] Не удалось найти панель настроек расширений.'
            );
        }
    }, 300);

    console.log('[Love Clinic] Готово.');
}

/*
 * Для ST с hooks.activate.
 */
export function onActivate() {
    init();
}

/*
 * Дополнительная страховка:
 * если ST запустит файл без lifecycle hook.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
