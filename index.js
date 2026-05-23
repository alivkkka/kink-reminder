function showKinkReminderModal() {
    $('#kink-reminder-modal').remove();

    // Ищем имя бота
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

// Привязываем действие к официальной кнопке Таверны
jQuery(async () => {
    $(document).on('click', '#kink_nav_btn', function(e) {
        e.preventDefault();
        showKinkReminderModal();
    });
    console.log("Kink Reminder кнопка привязана!");
});
