function showKinkReminderModal() {
    $('#kink-reminder-modal').remove();

    let botName = $('.shadow_text-block').text() || $('.pe-character-name').text() || $('#nav-bar .character-name').text() || 'Бот';
    botName = botName.trim().split('\n')[0];

    const savedText = localStorage.getItem('kink_' + botName) || '';

    const modalHtml = `
        <div id="kink-reminder-modal">
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

(function() {
    setInterval(() => {
        if ($('#kink-floating-btn').length > 0) return;
        
        if ($('body').length > 0) {
            const btnHtml = `<div id="kink-floating-btn">🌶️</div>`;
            $('body').append(btnHtml);

            $(document).off('click', '#kink-floating-btn').on('click', '#kink-floating-btn', function() {
                showKinkReminderModal();
            });
        }
    }, 1500);
})();
