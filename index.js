import { getContext, eventSource, event_types } from "../../../extensions.js";

const extensionName = "kink-reminder";

let currentKinks = [];

// 1. Функция для вытаскивания кинков из карточки
function extractKinks(character) {
    let text = "";
    if (character.description) text += character.description + "\n";
    if (character.personality) text += character.personality + "\n";
    if (character.scenario) text += character.scenario + "\n";
    if (character.first_mes) text += character.first_mes + "\n";

    const kinkKeywords = /(?:kinks?|fetishes?|turn-ons?|предпочтения|фетиши|кинки|извращения)/i;
    const lines = text.split('\n');
    let kinkSection = [];
    let inKinkSection = false;

    for (let line of lines) {
        if (kinkKeywords.test(line)) {
            inKinkSection = true;
            let cleanedLine = line.replace(/.*?:/, '').trim();
            if (cleanedLine) kinkSection.push(cleanedLine);
            continue;
        }
        if (inKinkSection) {
            if (line.match(/^[A-ZА-Я][a-zа-я]+:/) && kinkSection.length > 0) {
                inKinkSection = false;
            } else if (line.trim() !== "") {
                kinkSection.push(line.trim());
            }
        }
    }

    let rawKinks = kinkSection.join(', ');
    let kinksArray = rawKinks.split(/[,;\n]/).map(k => k.trim()).filter(k => k.length > 2);
    
    if (kinksArray.length === 0) {
        kinksArray = ["Стандартные предпочтения (не найдены в карте)"];
    }
    return kinksArray;
}

// 2. Создание окна "Медкарточки"
function createMedicalCard() {
    if (document.getElementById('kink-medical-card')) return;

    const cardHtml = `
        <div id="kink-medical-card">
            <h2>🩺 Медицинская карта кинков</h2>
            <div class="kink-list" id="kink-list-container"></div>
            <div class="kink-buttons">
                <button id="roll-kink-btn">🎲 Бросить кубик</button>
                <button id="close-card-btn" style="background: #999;">Закрыть</button>
            </div>
        </div>
    `;
    
    $('body').append(cardHtml);
    updateKinkListUI();

    $('#close-card-btn').on('click', () => {
        $('#kink-medical-card').remove();
    });

    $('#roll-kink-btn').on('click', () => {
        if (currentKinks.length > 0) {
            const randomKink = currentKinks[Math.floor(Math.random() * currentKinks.length)];
            const context = getContext();
            context.sendMessage(`🎲 **Рулетка кинков:** Выпало: *${randomKink}*`);
            $('.kink-item').css('background', 'transparent');
            $(`.kink-item:contains('${randomKink}')`).css('background', '#ffeb3b');
        }
    });
}

function updateKinkListUI() {
    const container = $('#kink-list-container');
    container.empty();
    if (currentKinks.length === 0) {
        container.append('<div class="kink-item">Кинки не найдены. Проверьте карту персонажа.</div>');
        return;
    }
    currentKinks.forEach(kink => {
        container.append(`<div class="kink-item">💊 ${kink}</div>`);
    });
}

// 3. Открытие медкарты
async function openKinkReminder() {
    const context = getContext();
    const character = context.characters[context.characterId];
    
    if (!character) {
        if (typeof toastr !== 'undefined') toastr.warning("Сначала выберите персонажа в чате!");
        return;
    }
    currentKinks = extractKinks(character);
    createMedicalCard();
}

// 4. Добавляем ПЛАВАЮЩУЮ КНОПКУ при загрузке
jQuery(async () => {
    // Плавающая кнопка в углу
    const floatBtnHtml = `<div id="kink-float-btn" title="Love Clinic">🩺</div>`;
    $('body').append(floatBtnHtml);
    $('#kink-float-btn').on('click', openKinkReminder);

    // Кнопка в меню расширений (сработает, когда Таверна загрузит интерфейс)
    eventSource.on(event_types.APP_READY, () => {
        const settingsHtml = `
        <div class="kink-reminder-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Love Clinic (Kink Reminder)</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <p>Вытаскивает фетиши из карты персонажа и позволяет выбрать случайный.</p>
                    <button id="open-kink-card-btn" class="menu_button">Открыть Медкарту</button>
                </div>
            </div>
        </div>`;
        
        $('#extensions_settings').append(settingsHtml);
        $('#open-kink-card-btn').on('click', openKinkReminder);
    });
});