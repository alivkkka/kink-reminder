jQuery(() => {

    // Добавляем раздел в меню расширений
    const settingsHtml = `
    <div id="kink-reminder-settings" class="extension_block">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>🌶️ Kink Reminder</b>
            </div>

            <div class="inline-drawer-content">

                <p style="margin-bottom:10px;">
                    Заметки, фетиши и стоп-слова персонажа
                </p>

                <textarea
                    id="kink-menu-text"
                    style="
                        width:100%;
                        height:140px;
                        background:#1a1a24;
                        color:white;
                        border:1px solid #444;
                        border-radius:8px;
                        padding:10px;
                        resize:vertical;
                        box-sizing:border-box;
                    "
                ></textarea>

                <button id="save-kink-menu" class="menu_button" style="margin-top:10px;">
                    Сохранить
                </button>

            </div>
        </div>
    </div>
    `;

    $("#extensions_settings").append(settingsHtml);

    // Получаем имя персонажа
    function getBotName() {
        let botName =
            $('.shadow_text-block').first().text() ||
            $('.pe-character-name').text() ||
            $('#nav-bar .character-name').text() ||
            'Бот';

        return botName.trim().split('\n')[0];
    }

    // Загрузка
    function loadData() {
        const botName = getBotName();
        const saved = localStorage.getItem('kink_' + botName) || '';
        $('#kink-menu-text').val(saved);
    }

    loadData();

    // Сохранение
    $(document).on('click', '#save-kink-menu', function () {

        const botName = getBotName();
        const text = $('#kink-menu-text').val();

        localStorage.setItem('kink_' + botName, text);

        const btn = $(this);

        btn.text('Сохранено ✓');

        setTimeout(() => {
            btn.text('Сохранить');
        }, 1500);
    });

});