// =========================================
// FLOATING PEACH
// =========================================

function createFloatingButton() {

    if ($("#kink-floating-btn").length) return;

    $("body").append(`

        <div id="kink-floating-btn">
            🍑
        </div>

    `);

    const btn = document.getElementById(
        "kink-floating-btn"
    );

    // Позиция из памяти

    const savedX =
        localStorage.getItem("kr_btn_x");

    const savedY =
        localStorage.getItem("kr_btn_y");

    if (savedX && savedY) {

        btn.style.left = savedX + "px";
        btn.style.top = savedY + "px";

    } else {

        btn.style.left = "20px";
        btn.style.top = "220px";
    }

    // =========================
    // DRAG SYSTEM
    // =========================

    let isDragging = false;

    let offsetX = 0;
    let offsetY = 0;

    // TOUCH START

    btn.addEventListener("touchstart", e => {

        isDragging = true;

        const touch = e.touches[0];

        offsetX =
            touch.clientX - btn.offsetLeft;

        offsetY =
            touch.clientY - btn.offsetTop;

    });

    // TOUCH MOVE

    document.addEventListener("touchmove", e => {

        if (!isDragging) return;

        const touch = e.touches[0];

        const x =
            touch.clientX - offsetX;

        const y =
            touch.clientY - offsetY;

        btn.style.left = x + "px";
        btn.style.top = y + "px";

    });

    // TOUCH END

    document.addEventListener("touchend", () => {

        if (!isDragging) return;

        isDragging = false;

        localStorage.setItem(
            "kr_btn_x",
            parseInt(btn.style.left)
        );

        localStorage.setItem(
            "kr_btn_y",
            parseInt(btn.style.top)
        );
    });

    // =========================
    // OPEN MODAL
    // =========================

    btn.addEventListener("click", () => {

        openModal();
    });
}
