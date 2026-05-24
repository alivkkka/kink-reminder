import { getContext } from "../../../extensions.js";

jQuery(async () => {

    // =====================================================
    // SETTINGS
    // =====================================================

    const DEFAULT_SETTINGS = {
        floatingButton: true
    };

    let settings =
        JSON.parse(
            localStorage.getItem("kr_settings")
        ) || DEFAULT_SETTINGS;

    function saveSettings() {

        localStorage.setItem(
            "kr_settings",
            JSON.stringify(settings)
        );
    }

    // =====================================================
    // EXTENSION PANEL
    // =====================================================

    const settingsHtml = `

    <div class="extension_block">

        <div class="inline-drawer">

            <div class="inline-drawer-toggle inline-drawer-header">
                🍑 Kink Reminder
            </div>

            <div class="inline-drawer-content">

                <label class="checkbox_label">

                    <input
                        type="checkbox"
                        id="kr-toggle-floating">

                    Floating button

                </label>

                <button
                    id="kr-open-panel"
                    class="menu_button">

                    🍑 Open Window

                </button>

            </div>

        </div>

    </div>

    `;

    $("#extensions_settings")
        .append(settingsHtml);

    // =====================================================
    // LOAD SETTINGS
    // =====================================================

    $("#kr-toggle-floating")
        .prop(
            "checked",
            settings.floatingButton
        );

    // =====================================================
    // SETTINGS EVENTS
    // =====================================================

    $(document).on(
        "change",
        "#kr-toggle-floating",

        function () {

            settings.floatingButton =
                this.checked;

            saveSettings();

            updateFloatingButton();
        }
    );

    // =====================================================
    // CHARACTER
    // =====================================================

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

    // =====================================================
    // MODAL
    // =====================================================

    function createModal() {

        if ($("#kr-modal").length)
            return;

        $("body").append(`

        <div id="kr-modal">

            <div id="kr-modal-box">

                <div id="kr-header">

                    <span id="kr-title">
                        🍑 Kink Reminder
                    </span>

                    <span id="kr-close">
                        ×
                    </span>

                </div>

                <textarea
                    id="kr-textarea"
                    placeholder="Character kinks..."
                ></textarea>

                <button id="kr-save">

                    💾 Save

                </button>

            </div>

        </div>

        `);
    }

    createModal();

    // =====================================================
    // OPEN MODAL
    // =====================================================

    function openModal() {

        loadCharacterData();

        $("#kr-modal")
            .css("display", "flex")
            .hide()
            .fadeIn(120);
    }

    // =====================================================
    // CLOSE
    // =====================================================

    $(document).on(
        "click",
        "#kr-close",

        function () {

            $("#kr-modal")
                .fadeOut(120);
        }
    );

    // =====================================================
    // LOAD DATA
    // =====================================================

    function loadCharacterData() {

        const key =
            getCharacterKey();

        const saved =
            localStorage.getItem(
                "kr_" + key
            ) || "";

        $("#kr-textarea")
            .val(saved);
    }

    // =====================================================
    // SAVE DATA
    // =====================================================

    $(document).on(
        "click",
        "#kr-save",

        function () {

            const key =
                getCharacterKey();

            localStorage.setItem(

                "kr_" + key,

                $("#kr-textarea").val()
            );

            toastr.success(
                "Saved"
            );
        }
    );

    // =====================================================
    // FLOATING BUTTON
    // =====================================================

    function createFloatingButton() {

        if ($("#kr-floating").length)
            return;

        $("body").append(`

            <div id="kr-floating">
                🍑
            </div>

        `);

        const btn =
            document.getElementById(
                "kr-floating"
            );

        // =========================================
        // SAVED POSITION
        // =========================================

        const savedX =
            localStorage.getItem(
                "kr_btn_x"
            );

        const savedY =
            localStorage.getItem(
                "kr_btn_y"
            );

        btn.style.left =
            savedX || "20px";

        btn.style.top =
            savedY || "220px";

        // =========================================
        // DRAG
        // =========================================

        let dragging = false;

        let moved = false;

        let offsetX = 0;
        let offsetY = 0;

        btn.addEventListener(
            "touchstart",

            e => {

                dragging = true;

                moved = false;

                const touch =
                    e.touches[0];

                offsetX =
                    touch.clientX -
                    btn.offsetLeft;

                offsetY =
                    touch.clientY -
                    btn.offsetTop;
            },

            { passive: true }
        );

        document.addEventListener(
            "touchmove",

            e => {

                if (!dragging)
                    return;

                moved = true;

                const touch =
                    e.touches[0];

                btn.style.left =
                    touch.clientX -
                    offsetX + "px";

                btn.style.top =
                    touch.clientY -
                    offsetY + "px";
            },

            { passive: true }
        );

        document.addEventListener(
            "touchend",

            () => {

                if (!dragging)
                    return;

                dragging = false;

                localStorage.setItem(
                    "kr_btn_x",
                    btn.style.left
                );

                localStorage.setItem(
                    "kr_btn_y",
                    btn.style.top
                );

                // TAP

                if (!moved) {

                    openModal();
                }
            }
        );
    }

    function removeFloatingButton() {

        $("#kr-floating")
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

    // =====================================================
    // OPEN FROM EXTENSIONS
    // =====================================================

    $(document).on(
        "click",
        "#kr-open-panel",

        function () {

            openModal();
        }
    );

});
