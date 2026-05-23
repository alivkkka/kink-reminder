// Функция открытия окна
function showKinkReminderModal() {
    $('#kink-reminder-modal').remove();

    // Универсальный поиск имени персонажа
    let botName = $('.shadow_text-block').first().text() || $('.pe-character-name').text() || $('#nav-bar .character-name').text() || 'Бот';
    botName = botName.trim().split('\n')[0];

    const savedText = localStorage.getItem('kink_' + botName) || '';

    const modalHtml = `
        <div id="kink-reminder-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(3px); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">
            <div class="kink-modal-box">
                <div class="kink-modal-header">
                    <h3>🌶️ Kink Reminder</h3>
                    <span id="close-kink-modal">&times;</span>
                </div>
                <p style="margin: 0 0 12px 0; font-size: 0.95em; color: #bbb;">Персонаж: <b style="color: #fff;">${botName}</b></p>
                <textarea id="kink-modal-text" placeholder="Впиши сюда важные нюансы, кинки или стоп-слова бота...">${savedText}</textarea>
                <button id="save-kink-modal">Сохранить</button>
            </div>
        </div>
    `;

    $('body').append(modalHtml);

    $('#close-kink-modal, #kink-reminder-modal').on('click', function(e) {
        if (e.target === this) $('#kink-reminder-modal').remove();
    });

    $('#save-kink-modal').on('click', function() {
        const text = $('#kink-modal-text').val();
        localStorage.setItem('kink_' + botName, text);
        $(this).text('Сохранено! ✓').css('background', '#28a745');
        setTimeout(() => { $('#kink-reminder-modal').remove(); }, 800);
    });
}

// Официальная регистрация расширения в системе SillyTavern
jQuery(async () => {
    function createButton() {
        if ($('#kink-floating-btn').length > 0) return;
        
        const btnHtml = `<div id="kink-floating-btn" style="position: fixed; bottom: 140px; right: 20px; width: 46px; height: 46px; background: #ff4565; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.6em; cursor: pointer; z-index: 9999; box-shadow: 0 4px 15px rgba(255, 69, 101, 0.4); user-select: none;">🌶️</div>`;
        $('body').append(btnHtml);

        $(document).off('click', '#kink-floating-btn').on('click', '#kink-floating-btn', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showKinkReminderModal();
        });
    }

    // Запускаем постоянную проверку, чтобы кнопка не исчезала при переключении чатов
    setInterval(createButton, 1000);
    console.log("Kink Reminder успешно инициализирован системой!");
});
