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

    let startX = 0;
    let startY = 0;

    let offsetX = 0;
    let offsetY = 0;

    btn.addEventListener(
        "touchstart",

        e => {

            const touch =
                e.touches[0];

            isDragging = true;

            moved = false;

            startX = touch.clientX;
            startY = touch.clientY;

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

            if (!isDragging)
                return;

            const touch =
                e.touches[0];

            const dx =
                Math.abs(
                    touch.clientX - startX
                );

            const dy =
                Math.abs(
                    touch.clientY - startY
                );

            // ==================================
            // DETECT REAL DRAG
            // ==================================

            if (dx > 8 || dy > 8) {

                moved = true;
            }

            if (!moved)
                return;

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
        },

        { passive: true }
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
            // TAP = OPEN MODAL
            // ==================================

            if (!moved) {

                openModal();
            }
        }
    );
}
