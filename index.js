import {
    getContext
} from "../../../extensions.js";

jQuery(async () => {

    // =========================================
    // SETTINGS
    // =========================================

    const DEFAULT_SETTINGS = {

        floatingButton: true,
        autoScan: true,
        autoReminder: false

    };

    let settings =
        JSON.parse(
            localStorage.getItem("kink_reminder_settings")
        ) || DEFAULT_SETTINGS;

    // =========================================
    // EXTENSIONS MENU UI
    // =========================================

    const settingsHtml = `

    <div id="kink-reminder-settings" class="extension_block">

        <div class="inline-drawer">

            <div class="inline-drawer-toggle inline-drawer-header">
                🌶️ Kink Reminder
            </div>

            <div class="inline-drawer-content">

                <label class="kink-setting-row">
                    <input type="checkbox" id="kr-floating-toggle">
                    Floating кнопка
                </label>

                <label class="kink-setting-row">
                    <input type="checkbox" id="kr-autoscan-toggle">
                    Авто-скан персонажа
                </label>

                <label class="kink-setting-row">
                    <input type="checkbox" id="kr-reminder-toggle">
                    Auto reminder (WIP)
                </label>

                <button id="kr-open-window" class="menu_button">
                    🌶️ Открыть окно
                </button>

            </div>

        </div>

    </div>

    `;

    $("#extensions_settings").append(settingsHtml);

    // =========================================
    // LOAD SETTINGS UI
    // =========================================

    $("#kr-floating-toggle")
        .prop("checked", settings.floatingButton);

    $("#kr-autoscan-toggle")
        .prop("checked", settings.autoScan);

    $("#kr-reminder-toggle")
        .prop("checked", settings.autoReminder);

    // =========================================
    // SAVE SETTINGS
    // =========================================

    function saveSettings() {

        localStorage.setItem(
            "kink_reminder_settings",
            JSON.stringify(settings)
        );
    }

    // =========================================
    // SETTINGS EVENTS
    // =========================================

    $(document).on("change", "#kr-floating-toggle", function () {

        settings.floatingButton = this.checked;

        saveSettings();

        updateFloatingButton();
    });

    $(document).on("change", "#kr-autoscan-toggle", function () {

        settings.autoScan = this.checked;

        saveSettings();
    });

    $(document).on("change", "#kr-reminder-toggle", function () {

        settings.autoReminder = this.checked;

        saveSettings();
    });

    // =========================================
    // FLOATING BUTTON
    // =========================================

    function createFloatingButton() {

        if ($("#kink-floating-btn").length) return;

        $("body").append(`
            <div id="kink-floating-btn">
                🌶️
            </div>
        `);
    }

    function removeFloatingButton() {

        $("#kink-floating-btn").remove();
    }

    function updateFloatingButton() {

        if (settings.floatingButton) {

            createFloatingButton();

        } else {

            removeFloatingButton();
        }
    }

    updateFloatingButton();

    // =========================================
    // CREATE MODAL
    // =========================================

    function createModal() {

        if ($("#kink-reminder-modal").length) return;

        $("body").append(`

        <div id="kink-reminder-modal">

            <div class="kink-modal-box">

                <div class="kink-modal-header">

                    <h3>
                        🌶️
                        <span id="kr-character-name">
                            Character
                        </span>
                    </h3>

                    <span id="close-kink-modal">
                        ×
                    </span>

                </div>

                <p class="kink-modal-desc">
                    Найденные preferences персонажа
                </p>

                <button id="scan-kinks-btn">
                    🔍 Сканировать карту
                </button>

                <textarea
                    id="kink-modal-text"
                    placeholder="Кинки персонажа..."
                ></textarea>

                <button id="save-kink-modal">
                    💾 Сохранить
                </button>

            </div>

        </div>

        `);
    }

    createModal();

    // =========================================
    // CHARACTER
    // =========================================

    function getCharacter() {

        const context = getContext();

        return context.characters[
            context.characterId
        ];
    }

    function getCharacterKey() {

        const char = getCharacter();

        return (
            char?.avatar ||
            char?.name ||
            "unknown"
        );
    }

    // =========================================
    // OPEN MODAL
    // =========================================

    function openModal() {

        const character = getCharacter();

        if (!character) {

            toastr.error("Персонаж не найден");

            return;
        }

        $("#kr-character-name")
            .text(character.name);

        loadCharacterData();

        $("#kink-reminder-modal")
            .fadeIn(120);
    }

    // =========================================
    // CLOSE MODAL
    // =========================================

    $(document).on("click", "#close-kink-modal", function () {

        $("#kink-reminder-modal")
            .fadeOut(120);
    });

    // =========================================
    // OPEN EVENTS
    // =========================================

    $(document).on("click", "#kink-floating-btn", function () {

        openModal();
    });

    $(document).on("click", "#kr-open-window", function () {

        openModal();
    });

    // =========================================
    // LOAD CHARACTER DATA
    // =========================================

    function loadCharacterData() {

        const key = getCharacterKey();

        const saved =
            localStorage.getItem(
                "kink_" + key
            ) || "";

        $("#kink-modal-text")
            .val(saved);
    }

    // =========================================
    // SAVE CHARACTER DATA
    // =========================================

    $(document).on("click", "#save-kink-modal", function () {

        const key = getCharacterKey();

        localStorage.setItem(

            "kink_" + key,

            $("#kink-modal-text").val()
        );

        $(this)
            .text("✓ Сохранено");

        setTimeout(() => {

            $("#save-kink-modal")
                .text("💾 Сохранить");

        }, 1200);
    });

    // =========================================
    // EXTRACT KINKS
    // =========================================

    function extractKinks(text) {

        const kinkKeywords = [

            "spitting",
            "deep throat",
            "deepthroat",
            "anal",
            "rough sex",
            "choking",
            "biting",
            "degradation",
            "orgasm control",
            "fingering",
            "shower sex",
            "semi-public",
            "facial",
            "facesitting",
            "praise",
            "breeding",
            "creampie",
            "edging",
            "bondage",
            "spanking",
            "dirty talk",

            // RU

            "сплёвывание",
            "глубокий минет",
            "анальный",
            "удушение",
            "укусы",
            "деградация",
            "контроль оргазма",
            "фистинг",
            "секс в душе",
            "полупубличный",
            "фейсситтинг",
            "грязные разговорчики",
            "жёсткий секс",
            "шлепки",
            "порка",
            "унижение",
            "эджинг",
            "связывание"

        ];

        const found = [];

        const lower =
            text.toLowerCase();

        for (const kink of kinkKeywords) {

            if (lower.includes(kink)) {

                found.push(kink);
            }
        }

        return [...new Set(found)];
    }

    // =========================================
    // GET CHARACTER TEXT
    // =========================================

    function getCharacterText(character) {

        return `

            ${character.description || ""}
            ${character.personality || ""}
            ${character.scenario || ""}
            ${character.first_mes || ""}
            ${character.mes_example || ""}

        `;
    }

    // =========================================
    // SCAN CHARACTER
    // =========================================

    $(document).on("click", "#scan-kinks-btn", function () {

        const character =
            getCharacter();

        if (!character) {

            toastr.error("Нет персонажа");

            return;
        }

        const text =
            getCharacterText(character);

        const kinks =
            extractKinks(text);

        if (!kinks.length) {

            $("#kink-modal-text")
                .val(
`Ничего не найдено автоматически.

Добавь вручную.`
                );

            toastr.warning(
                "Кинки не найдены"
            );

            return;
        }

        $("#kink-modal-text")
            .val(
                kinks
                    .map(x => `• ${x}`)
                    .join("\n")
            );

        toastr.success(
            `Найдено: ${kinks.length}`
        );
    });

});
