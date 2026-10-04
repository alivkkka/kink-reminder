import { extension_settings, getContext } from "../../../extensions.js";
import { eventSource, event_types, saveSettingsDebounced } from "../../../../script.js";

const extensionName = "kink-reminder";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Список кинков, который мы вытащим из карты
let currentKinks = [];

// 1. Функция для вытаскивания кинков из карточки персонажа
function extractKinks(character) {
    let text = "";
    // Собираем весь текст из карточки: описание, характер, сценарий и т.д.
    if (character.description) text += character.description + "\n";
    if (character.personality) text += character.personality + "\n";
    if (character.scenario) text += character.scenario + "\n";
    if (character.first_mes) text += character.first_mes + "\n";

    // Ищем раздел с кинками (ищем ключевые слова)
    const kinkKeywords = /(?:kinks?|fetishes?|turn-ons?|предпочтения|фетиши|кинки|извращения)/i;
    const lines = text.split('\n');
    let kinkSection = [];
    let inKinkSection = false;

    for (let line of lines) {
        if (kinkKeywords.test(line)) {
            inKinkSection = true;
            // Убираем сам заголовок, оставляем только то, что после двоеточия
            let cleanedLine = line.replace(/.*?:/, '').trim();
            if (cleanedLine) kinkSection.push(cleanedLine);
            continue;
        }
        
        // Если мы уже в разделе кинков, собираем строки, пока не наткнемся на другой заголовок
        if (inKinkSection) {
            if (line.match(/^[A-ZА-Я][a-zа-я]+:/) && kinkSection.length > 0) {
                inKinkSection = false; // Наткнулись на новый заголовок, выходим
            } else if (line.trim() !== "") {
                kinkSection.push(line.trim());
            }
        }
    }

    // Разбиваем собранный текст на отдельные кинки (по запятым или с новой строки)
    let rawKinks = kinkSection.join(', ');
    let kinksArray = rawKinks.split(/[,;\n]/).map(k => k.trim()).filter(k => k.length > 2);
    
    // Если ничего не нашли, ставим заглушку
    if (kinksArray.length === 0) {
        kinksArray = ["Стандартные предпочтения (не найдены в карте)"];
    }
    
    return kinksArray;
}

// 2. Создание HTML-окна "Медкарточки"
function createMedicalCard() {
    if (document.getElementById('kink-medical-card')) return; // Если уже открыто, не создаем

    const cardHtml = `
        <div id="kink-medical-card">
            <h2>🩺 Медицинская карта кинков</h2>
            <div class="kink-list" id="kink-list-container">
                <!-- Сюда вставятся кинки -->
            </div>
            <div class="kink-buttons">
                <button id="roll-kink-btn">🎲 Бросить кубик</button>
                <button id="close-card-btn" style="background: #999;">Закрыть</button>
            </div>
        </div>
    `;
    
    $('body').append(cardHtml);
    updateKinkListUI();

    // Обработчики кнопок
    $('#close-card-btn').on('click', () => {
        $('#kink-medical-card').remove();
    });

    $('#roll-kink-btn').on('click', () => {
        if (currentKinks.length > 0) {
            const randomKink = currentKinks[Math.floor(Math.random() * currentKinks.length)];
            
            // Отправляем в чат
            const context = getContext();
            context.sendMessage(`🎲 **Рулетка кинков:** Выпало: *${randomKink}*`);
            
            // Подсвечиваем в окне
            $('.kink-item').css('background', 'transparent');
            $(`.kink-item:contains('${randomKink}')`).css('background', '#ffeb3b');
        }
    });
}

// 3. Обновление списка кинков в UI
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

// 4. Главная функция расширения (запускается при клике на иконку)
async function openKinkReminder() {
    const context = getContext();
    const character = context.characters[context.characterId];
    
    if (!character) {
        toastr.warning("Сначала выберите персонажа в чате!");
        return;
    }

    // Вытаскиваем кинки
    currentKinks = extractKinks(character);
    
    // Создаем окно
    createMedicalCard();
}

// 5. Добавление кнопки в меню расширений SillyTavern
jQuery(async () => {
    const settingsHtml = `
    <div class="kink-reminder-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Kink Medical Card</b>
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