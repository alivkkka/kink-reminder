import { getContext } from "../../../extensions.js";

jQuery(async () => {

    const DEFAULT_SETTINGS = {
        floatingButton: true,
        autoScan: true
    };

    let settings = JSON.parse(localStorage.getItem("kink_reminder_settings")) || DEFAULT_SETTINGS;

    function saveSettings() {
        localStorage.setItem("kink_reminder_settings", JSON.stringify(settings));
    }

    // Добавляем тумблеры в стандартное меню расширений Таверны
    const settingsHtml = `
    <div id="kink-reminder-settings" class="extension_block">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">🌶️ Kink Reminder</div>
            <div class="inline-drawer-content">
                <label class="kink-setting-row"><input type="checkbox" id="kr-floating-toggle"> Floating 🍑 Кнопка</label>
                <button id="kr-open-window" class="menu_button">🍑 Открыть интерфейс</button>
            </div>
        </div>
    </div>`;
    $("#extensions_settings").append(settingsHtml);

    $("#kr-floating-toggle").prop("checked", settings.floatingButton);
    $(document).on("change", "#kr-floating-toggle", function () {
        settings.floatingButton = this.checked;
        saveSettings();
        updateFloatingButton();
    });

    function getCharacter() {
        const context = getContext();
        return context.characters[context.characterId];
    }

    function getCharacterKey() {
        const char = getCharacter();
        return char?.avatar || char?.name || "unknown";
    }

    // ==================================================
    // ГЕНЕРАЦИЯ ИНТЕРФЕЙСА (СТРУКТУРА VNE)
    // ==================================================
    function createModal() {
        if ($("#kink-reminder-modal").length) return;

        $("body").append(`
        <div id="kink-reminder-modal">
            <div class="kink-modal-box">
                <div class="kink-modal-header">
                    <h2>VISUAL KINK ENGINE v2.0</h2>
                    <span id="close-kink-modal">×</span>
                </div>

                <div class="kink-vne-section-title">📊 Системный журнал</div>
                <div class="kink-system-grid">
                    <div class="kink-grid-cell">
                        <div class="kink-cell-label">Связи</div>
                        <div class="kink-cell-value" id="kr-status-cell">Активно</div>
                    </div>
                    <div class="kink-grid-cell">
                        <div class="kink-cell-label">Главный фокус</div>
                        <div class="kink-cell-value" id="kr-focus-cell">-</div>
                    </div>
                </div>

                <div class="kink-vne-section-title">👤 Досье и Состояние</div>
                <div class="kink-bot-card">
                    <div class="kink-bot-identity">
                        <img class="kink-bot-avatar" id="kr-bot-img" src="" alt="avatar">
                        <div class="kink-bot-meta">
                            <div class="kink-bot-name" id="kr-bot-name">Бот</div>
                            <div class="kink-lust-container">
                                <div class="kink-cell-label">Похоть: <span id="kr-lust-val">0</span>%</div>
                                <input type="range" min="0" max="100" value="0" class="kink-lust-slider" id="kr-lust-range">
                            </div>
                        </div>
                    </div>
                    
                    <div class="kink-roulette-box">
                        <div class="kink-cell-label">⚡ Импульс в эту минуту:</div>
                        <div id="kr-roulette-result">Рулетка не запущена</div>
                        <button class="kink-roulette-btn" id="kr-roll-btn">🎰 Бросить кубик желаний</button>
                    </div>
                </div>

                <div class="kink-vne-section-title">🩺 Карта предпочтений (Сканер)</div>
                <button id="scan-kinks-btn">🔍 Сканировать карту бота</button>
                <textarea id="kink-modal-text" placeholder="Список кинков через запятую или списком..."></textarea>
                
                <button id="save-kink-modal">💾 Сохранить изменения</button>
            </div>
        </div>
        `);
    }

    createModal();

    // ==================================================
    // ЛОГИКА ОТКРЫТИЯ ОКНА И ЗАГРУЗКИ ДАННЫХ
    // ==================================================
    function openModal() {
        const character = getCharacter();
        if (!character) {
            toastr.error("Персонаж не выбран в чате");
            return;
        }

        // Подгружаем имя и аватарку из Таверны
        $("#kr-focus-cell").text(character.name);
        $("#kr-bot-name").text(character.name);
        
        if (character.avatar) {
            $("#kr-bot-img").attr("src", `/thumbnail?type=avatar&file=${character.avatar}`);
        } else {
            $("#kr-bot-img").attr("src", "../../../img/five.png");
        }

        // Загружаем сохраненные данные кинков и похоти
        const key = getCharacterKey();
        const savedKinks = localStorage.getItem("kink_vne_" + key) || "";
        const savedLust = localStorage.getItem("lust_vne_" + key) || "0";

        $("#kink-modal-text").val(savedKinks);
        $("#kr-lust-range").val(savedLust);
        $("#kr-lust-val").text(savedLust);
        $("#kr-roulette-result").text("Рулетка готова");

        $("#kink-reminder-modal").css("display", "flex").hide().fadeIn(150);
    }

    // Закрытие окна
    $(document).on("click", "#close-kink-modal", function () {
        $("#kink-reminder-modal").fadeOut(150);
    });

    // Изменение ползунка похоти
    $(document).on("input", "#kr-lust-range", function() {
        $("#kr-lust-val").text(this.value);
    });

    // Кнопка Сохранить данные
    $(document).on("click", "#save-kink-modal", function () {
        const key = getCharacterKey();
        localStorage.setItem("kink_vne_" + key, $("#kink-modal-text").val());
        localStorage.setItem("lust_vne_" + key, $("#kr-lust-range").val());

        $(this).text("✓ Данные зафиксированы");
        setTimeout(() => { $(this).text("💾 Сохранить изменения"); }, 1200);
    });

    // ==================================================
    // РАБОТА СИТУАЦИОННОЙ РУЛЕТКИ 🎰
    // ==================================================
    $(document).on("click", "#kr-roll-btn", function() {
        const text = $("#kink-modal-text").val();
        
        // Разбиваем текст из медкарты на отдельные строчки/пункты
        const lines = text.split(/[\n,•]+/).map(x => x.trim()).filter(x => x.length > 1 && !x.includes("Ничего не найдено"));

        if (!lines.length) {
            $("#kr-roulette-result").text("❌ Карта предпочтений пуста");
            return;
        }

        // Анимация крутилки (эффект мерцания перед выдачей результата)
        let counter = 0;
        const interval = setInterval(() => {
            const tempRandom = lines[Math.floor(Math.random() * lines.length)];
            $("#kr-roulette-result").text(`🎲 ${tempRandom}...`);
            counter++;
            if (counter > 6) {
                clearInterval(interval);
                // Финальный выбор 1-2 случайных кинков
                const finalKink1 = lines[Math.floor(Math.random() * lines.length)];
                let finalResult = `🔥 Порыв: ${finalKink1}`;
                
                // С шансом 40% подбрасываем второй сопутствующий кинк для остроты
                if (Math.random() > 0.6 && lines.length > 1) {
                    let finalKink2 = lines[Math.floor(Math.random() * lines.length)];
                    if (finalKink2 !== finalKink1) {
                        finalResult += ` + ${finalKink2}`;
                    }
                }
                
                $("#kr-roulette-result").text(finalResult);
                toastr.info("Рулетка определила импульс сцены!");
            }
        }, 80);
    });

    // ==================================================
    // СИСТЕМА СКАНИРОВАНИЯ
    // ==================================================
    function extractKinks(text) {
        const keywords = [
            "spitting", "deep throat", "deepthroat", "anal", "rough sex", "choking", "biting",
            "degradation", "orgasm control", "fingering", "shower sex", "semi-public", "facial",
            "facesitting", "dirty talk", "spanking", "bondage", "public", "risk",
            "сплёвывание", "глубокий минет", "анальный", "удушение", "укусы", "деградация",
            "контроль оргазма", "фистинг", "секс в душе", "полупубличный", "публично", "риск",
            "фейсситтинг", "грязные разговорчики", "жёсткий секс", "шлепки", "порка", "унижение"
        ];
        const found = [];
        const lower = text.toLowerCase();
        for (const kink of keywords) {
            if (lower.includes(kink)) found.push(kink);
        }
        return [...new Set(found)];
    }

    $(document).on("click", "#scan-kinks-btn", function () {
        const character = getCharacter();
        if (!character) return;

        const fullText = `
            ${character.description || ""}
            ${character.personality || ""}
            ${character.scenario || ""}
            ${character.first_mes || ""}
            ${character.mes_example || ""}
        `;

        const kinks = extractKinks(fullText);

        if (!kinks.length) {
            $("#kink-modal-text").val("Ничего не найдено автоматически.\n\nДобавь вручную.");
            return;
        }

        $("#kink-modal-text").val(kinks.map(x => `• ${x}`).join("\n"));
        toastr.success(`Успешный скан! Найдено кинков: ${kinks.length}`);
    });

    // ТАЧ-СИСТЕМА ДЛЯ ПЕРЕМЕЩЕНИЯ ПЕРСИКА НА СМАРТФОНЕ
    function createFloatingButton() {
        if ($("#kink-floating-btn").length) return;
        $("body").append(`<div id="kink-floating-btn">🍑</div>`);

        const btn = document.getElementById("kink-floating-btn");
        const savedX = localStorage.getItem("kr_btn_x");
        const savedY = localStorage.getItem("kr_btn_y");

        if (savedX && savedY) {
            btn.style.left = savedX + "px";
            btn.style.top = savedY + "px";
        } else {
            btn.style.left = "18px";
            btn.style.top = "220px";
        }

        let isDragging = false;
        let moved = false;
        let offsetX = 0, offsetY = 0;

        btn.addEventListener("touchstart", e => {
            moved = false; isDragging = true;
            const touch = e.touches[0];
            offsetX = touch.clientX - btn.offsetLeft;
            offsetY = touch.clientY - btn.offsetTop;
        });

        document.addEventListener("touchmove", e => {
            if (!isDragging) return;
            moved = true;
            const touch = e.touches[0];
            btn.style.left = (touch.clientX - offsetX) + "px";
            btn.style.top = (touch.clientY - offsetY) + "px";
        });

        document.addEventListener("touchend", () => {
            if (!isDragging) return;
            isDragging = false;
            localStorage.setItem("kr_btn_x", parseInt(btn.style.left));
            localStorage.setItem("kr_btn_y", parseInt(btn.style.top));
            if (!moved) openModal();
        });
    }

    function removeFloatingButton() { $("#kink-floating-btn").remove(); }
    function updateFloatingButton() { if (settings.floatingButton) createFloatingButton(); else removeFloatingButton(); }

    updateFloatingButton();
    $(document).on("click", "#kr-open-window", function () { openModal(); });
});
