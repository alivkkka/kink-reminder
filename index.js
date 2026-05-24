import { getContext } from "../../../extensions.js";

jQuery(async () => {

    const context = getContext();

    // ===== UI =====

    const settingsHtml = `
    <div id="kink-reminder-settings" class="extension_block">

        <div class="inline-drawer">

            <div class="inline-drawer-toggle inline-drawer-header">
                🌶️ Kink Reminder
            </div>

            <div class="inline-drawer-content">

                <p class="kink-desc">
                    AI анализирует карту персонажа и ищет возможные предпочтения.
                </p>

                <button id="scan-kinks-btn" class="menu_button">
                    🔍 Сканировать карту персонажа
                </button>

                <textarea
                    id="kink-menu-text"
                    placeholder="Здесь появятся найденные preferences..."
                ></textarea>

                <button id="save-kink-menu" class="menu_button">
                    💾 Сохранить
                </button>

            </div>

        </div>

    </div>
    `;

    $("#extensions_settings").append(settingsHtml);

    // ===== Получение персонажа =====

    function getCharacter() {

        const context = getContext();

        const character = context.characters[context.characterId];

        return character;
    }

    // ===== Получение ID =====

    function getCharacterKey() {

        const char = getCharacter();

        return char?.avatar || char?.name || "unknown";
    }

    // ===== Загрузка =====

    function loadSavedData() {

        const key = getCharacterKey();

        const saved =
            localStorage.getItem("kink_" + key) || "";

        $("#kink-menu-text").val(saved);
    }

    // ===== Анализ карты =====

    function analyzeCharacterCard(character) {

        const fullText = `
            ${character.description || ""}
            ${character.personality || ""}
            ${character.scenario || ""}
            ${character.first_mes || ""}
            ${character.mes_example || ""}
        `.toLowerCase();

        const detected = [];

        const kinkMap = {
            teasing: [
                "tease",
                "playful",
                "mocking",
                "flirty"
            ],

            possessive: [
                "possessive",
                "mine",
                "jealous",
                "controlling"
            ],

            dominant: [
                "dominant",
                "dom",
                "commanding",
                "control"
            ],

            submissive: [
                "submissive",
                "obedient",
                "shy",
                "sub"
            ],

            praise: [
                "good girl",
                "good boy",
                "praise"
            ],

            biting: [
                "bite",
                "marking",
                "neck kisses"
            ],

            rough: [
                "rough",
                "aggressive",
                "hard thrust"
            ],

            romantic: [
                "gentle",
                "loving",
                "affectionate",
                "soft kisses"
            ]
        };

        for (const [label, words] of Object.entries(kinkMap)) {

            for (const word of words) {

                if (fullText.includes(word)) {

                    detected.push(label);

                    break;
                }
            }
        }

        return detected;
    }

    // ===== Scan =====

    $(document).on("click", "#scan-kinks-btn", function () {

        const character = getCharacter();

        if (!character) {
            toastr.error("Персонаж не найден");
            return;
        }

        const result = analyzeCharacterCard(character);

        if (result.length === 0) {

            $("#kink-menu-text").val(
                "Ничего не найдено автоматически.\nДобавь вручную."
            );

            return;
        }

        const formatted =
            result.map(x => `• ${x}`).join("\n");

        $("#kink-menu-text").val(formatted);

        toastr.success("Карта персонажа проанализирована");
    });

    // ===== Save =====

    $(document).on("click", "#save-kink-menu", function () {

        const key = getCharacterKey();

        const text = $("#kink-menu-text").val();

        localStorage.setItem(
            "kink_" + key,
            text
        );

        toastr.success("Preferences сохранены");
    });

    // ===== Auto load =====

    setTimeout(loadSavedData, 1000);

});
