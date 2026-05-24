import {
    getContext
} from "../../../extensions.js";

jQuery(async () => {

    // ==================================================
    // SETTINGS
    // ==================================================

    const DEFAULT_SETTINGS = {

        floatingButton: true,
        autoScan: true

    };

    let settings =
        JSON.parse(
            localStorage.getItem(
                "kink_reminder_settings"
            )
        ) || DEFAULT_SETTINGS;

    function saveSettings() {

        localStorage.setItem(
            "kink_reminder_settings",
            JSON.stringify(settings)
        );
    }

    // ==================================================
    // EXTENSIONS PANEL
    // ==================================================

    const settingsHtml = `

    <div id="kink-reminder-settings"
         class="extension_block">

        <div class="inline-drawer">

            <div class="inline-drawer-toggle inline-drawer-header">

                🌶️ Kink Reminder

            </div>

            <div class="inline-drawer-content">

                <label class="kink-setting-row">

                    <input
                        type="checkbox"
                        id="kr-floating-toggle">

                    Floating 🍑 кнопка

                </label>

                <label class="kink-setting-row">

                    <input
                        type="checkbox"
                        id="kr-autoscan-toggle">

                    Авто-скан карты

                </label>

                <button
                    id="kr-open-window"
                    class="menu_button">

                    🍑 Открыть окно

                </button>

            </div>

        </div>

    </div>

    `;

    $("#extensions_settings")
        .append(settingsHtml);

    // ==================================================
    // LOAD SETTINGS UI
    // ==================================================

    $("#kr-floating-toggle")
        .prop(
            "checked",
            settings.floatingButton
        );

    $("#kr-autoscan-toggle")
        .prop(
            "checked",
            settings.autoScan
        );

    // ==================================================
    // SETTINGS EVENTS
    // ==================================================

    $(document).on(
        "change",
        "#kr-floating-toggle",

        function () {

            settings.floatingButton =
                this.checked;

            saveSettings();

            updateFloatingButton();
        }
    );

    $(document).on(
        "change",
        "#kr-autoscan-toggle",

        function () {

            settings.autoScan =
                this.checked;

            saveSettings();
        }
    );

    // ==================================================
    // CHARACTER
    // ==================================================

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

    // ==================================================
    // MODAL
    // ==================================================

    function createModal() {

        if ($("#kink-reminder-modal").length)
            return;

        $("body").append(`

        <div id="kink-reminder-modal">

            <div class="kink-modal-box">

                <div class="kink-modal-header">

                    <h3>

                        🍑

                        <span id="kr-character-name">

                            Character

                        </span>

                    </h3>

                    <span id="close-kink-modal">

                        ×

                    </span>

                </div>

                <p class="kink-modal-desc">

                    Кинки текущего персонажа

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

    // ==================================================
    // OPEN MODAL
    // ==================================================

    function openModal() {

        const character =
            getCharacter();

        if (!character) {

            toastr.error(
                "Персонаж не найден"
            );

            return;
        }

        $("#kr-character-name")
            .text(character.name);

        loadCharacterData();

        $("#kink-reminder-modal")
            .css("display", "flex")
            .hide()
            .fadeIn(120);
    }

    // ==================================================
    // CLOSE MODAL
    // ==================================================

    $(document).on(
        "click",
        "#close-kink-modal",

        function () {

            $("#kink-reminder-modal")
                .fadeOut(120);
        }
    );

    // ==================================================
    // FLOATING BUTTON
    // ==================================================

    function createFloatingButton() {

        if ($("#kink-floating-btn").length)
            return;

        $("body").append(`

            <div id="kink-floating-btn">
                🍑
            </div>

        `);

        const btn =
            document.getElementById(
                "kink-floating-btn"
            );

        // ======================================
        // SAVED POSITION
        // ======================================

        const savedX =
            localStorage.getItem(
                "kr_btn_x"
            );

        const savedY =
            localStorage.getItem(
                "kr_btn_y"
            );

        if (savedX && savedY) {

            btn.style.left =
                savedX + "px";

            btn.style.top =
                savedY + "px";

        } else {

            btn.style.left = "18px";
            btn.style.top = "220px";
        }

        // ======================================
        // DRAG SYSTEM
        // ======================================

        let isDragging = false;

        let moved = false;

        let offsetX = 0;
        let offsetY = 0;

        btn.addEventListener(
            "touchstart",

            e => {

                moved = false;

                isDragging = true;

                const touch =
                    e.touches[0];

                offsetX =
                    touch.clientX -
                    btn.offsetLeft;

                offsetY =
                    touch.clientY -
                    btn.offsetTop;
            }
        );

        document.addEventListener(
            "touchmove",

            e => {

                if (!isDragging)
                    return;

                moved = true;

                const touch =
                    e.touches[0];

                const x =
                    touch.clientX -
                    offsetX;

                const y =
                    touch.clientY -
                    offsetY;

                btn.style.left =
                    x + "px";

                btn.style.top =
                    y + "px";
            }
        );

        document.addEventListener(
            "touchend",

            () => {

                if (!isDragging)
                    return;

                isDragging = false;

                localStorage.setItem(
                    "kr_btn_x",

                    parseInt(
                        btn.style.left
                    )
                );

                localStorage.setItem(
                    "kr_btn_y",

                    parseInt(
                        btn.style.top
                    )
                );

                // ==================================
                // OPEN MODAL IF NOT DRAGGED
                // ==================================

                if (!moved) {

                    openModal();
                }
            }
        );
    }

    function removeFloatingButton() {

        $("#kink-floating-btn")
            .remove();
    }

    function updateFloatingButton() {

        if (settings.floatingButton) {

            createFloatingButton();

        } else {

            removeFloatingButton();
        }
    }

    updateFloatingButton();

    // ==================================================
    // OPEN FROM EXTENSIONS
    // ==================================================

    $(document).on(
        "click",
        "#kr-open-window",

        function () {

            openModal();
        }
    );

    // ==================================================
    // LOAD DATA
    // ==================================================

    function loadCharacterData() {

        const key =
            getCharacterKey();

        const saved =
            localStorage.getItem(
                "kink_" + key
            ) || "";

        $("#kink-modal-text")
            .val(saved);
    }

    // ==================================================
    // SAVE DATA
    // ==================================================

    $(document).on(
        "click",
        "#save-kink-modal",

        function () {

            const key =
                getCharacterKey();

            localStorage.setItem(

                "kink_" + key,

                $("#kink-modal-text")
                    .val()
            );

            $(this)
                .text("✓ Сохранено");

            setTimeout(() => {

                $("#save-kink-modal")
                    .text(
                        "💾 Сохранить"
                    );

            }, 1200);
        }
    );

    // ==================================================
    // KINK EXTRACTION
    // ==================================================

    function extractKinks(text) {

        const keywords = [

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
            "dirty talk",
            "spanking",
            "bondage",

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
            "унижение"

        ];

        const found = [];

        const lower =
            text.toLowerCase();

        for (const kink of keywords) {

            if (lower.includes(kink)) {

                found.push(kink);
            }
        }

        return [...new Set(found)];
    }

    // ==================================================
    // CHARACTER TEXT
    // ==================================================

    function getCharacterText(character) {

        return `

            ${character.description || ""}
            ${character.personality || ""}
            ${character.scenario || ""}
            ${character.first_mes || ""}
            ${character.mes_example || ""}

        `;
    }

    // ==================================================
    // SCAN
    // ==================================================

    $(document).on(
        "click",
        "#scan-kinks-btn",

        function () {

            const character =
                getCharacter();

            if (!character) {

                toastr.error(
                    "Нет персонажа"
                );

                return;
            }

            const text =
                getCharacterText(
                    character
                );

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
                        .map(
                            x => `• ${x}`
                        )
                        .join("\n")
                );

            toastr.success(
                `Найдено: ${kinks.length}`
            );
        }
    );

});
