import { getContext } from "../../../extensions.js";

jQuery(async () => {

    // =========================
    // FLOATING BUTTON
    // =========================

    if (!$("#kink-floating-btn").length) {

        $("body").append(`
            <div id="kink-floating-btn">
                🌶️
            </div>
        `);
    }

    // =========================
    // MODAL WINDOW
    // =========================

    function createModal() {

        if ($("#kink-reminder-modal").length) return;

        $("body").append(`

            <div id="kink-reminder-modal">

                <div class="kink-modal-box">

                    <div class="kink-modal-header">
                        <h3>🌶️ Kink Reminder</h3>
                        <span id="close-kink-modal">×</span>
                    </div>

                    <p class="kink-modal-desc">
                        Автоматический поиск NSFW preferences персонажа
                    </p>

                    <button id="scan-kinks-btn">
                        🔍 Сканировать карту
                    </button>

                    <textarea
                        id="kink-modal-text"
                        placeholder="Здесь появятся найденные кинки..."
                    ></textarea>

                    <button id="save-kink-modal">
                        💾 Сохранить
                    </button>

                </div>

            </div>

        `);

        loadSavedKinks();
    }

    // =========================
    // GET CHARACTER
    // =========================

    function getCharacter() {

        const context = getContext();

        const character =
            context.characters[context.characterId];

        return character;
    }

    // =========================
    // CHARACTER KEY
    // =========================

    function getCharacterKey() {

        const character = getCharacter();

        return (
            character?.avatar ||
            character?.name ||
            "unknown_character"
        );
    }

    // =========================
    // LOAD SAVED
    // =========================

    function loadSavedKinks() {

        const key = getCharacterKey();

        const saved =
            localStorage.getItem("kink_" + key) || "";

        $("#kink-modal-text").val(saved);
    }

    // =========================
    // SAVE
    // =========================

    $(document).on("click", "#save-kink-modal", function () {

        const key = getCharacterKey();

        const text =
            $("#kink-modal-text").val();

        localStorage.setItem(
            "kink_" + key,
            text
        );

        $(this)
            .text("✓ Сохранено");

        setTimeout(() => {

            $("#save-kink-modal")
                .text("💾 Сохранить");

        }, 1400);
    });

    // =========================
    // OPEN MODAL
    // =========================

    $(document).on("click", "#kink-floating-btn", function () {

        createModal();

        $("#kink-reminder-modal").fadeIn(150);

        loadSavedKinks();
    });

    // =========================
    // CLOSE MODAL
    // =========================

    $(document).on("click", "#close-kink-modal", function () {

        $("#kink-reminder-modal").fadeOut(150);
    });

    // =========================
    // KINK EXTRACTION
    // =========================

    function extractKinks(text) {

        if (!text) return [];

        const results = [];

        const kinkKeywords = [

            "spitting",
            "deep throat",
            "deepthroat",
            "anal",
            "rough sex",
            "choking",
            "biting",
            "marking",
            "degradation",
            "orgasm control",
            "fingering",
            "shower sex",
            "semi-public",
            "facial",
            "face sitting",
            "facesitting",
            "praise",
            "domination",
            "submission",
            "breeding",
            "creampie",
            "cockwarming",
            "humiliation",
            "edging",
            "throat fuck",
            "thigh riding",
            "bondage",
            "spanking",
            "pet play",
            "voyeurism",
            "exhibitionism",
            "size difference",
            "overstimulation",
            "cum play",
            "dirty talk",
            "gagging",
            "knife play",
            "roleplay",
            "public sex",
            "somnophilia",
            "dacryphilia",
            "mommy",
            "daddy",
            "master",
            "slave",
            "tentacles",
            "tail play",
            "monster sex",

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
            "доминирование",
            "подчинение",
            "унижение",
            "эджинг",
            "связывание",
            "ролеплей"
        ];

        const lower =
            text.toLowerCase();

        for (const kink of kinkKeywords) {

            if (lower.includes(kink)) {

                results.push(kink);
            }
        }

        return [...new Set(results)];
    }

    // =========================
    // FIND NSFW BLOCKS
    // =========================

    function getCharacterNSFWText(character) {

        const fields = [

            character.description || "",
            character.personality || "",
            character.scenario || "",
            character.first_mes || "",
            character.mes_example || ""

        ];

        return fields.join("\n\n");
    }

    // =========================
    // SCAN BUTTON
    // =========================

    $(document).on("click", "#scan-kinks-btn", function () {

        const character =
            getCharacter();

        if (!character) {

            toastr.error("Персонаж не найден");

            return;
        }

        const text =
            getCharacterNSFWText(character);

        const found =
            extractKinks(text);

        if (found.length === 0) {

            $("#kink-modal-text").val(
`Ничего не найдено автоматически.

Попробуй добавить вручную.`
            );

            toastr.warning("Кинки не найдены");

            return;
        }

        const formatted =
            found.map(x => `• ${x}`).join("\n");

        $("#kink-modal-text").val(formatted);

        toastr.success(
            `Найдено: ${found.length}`
        );
    });

});
