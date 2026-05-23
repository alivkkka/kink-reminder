// Функция, которая создаёт окошко внутри меню расширений Таверны
function initKinkSettings(container) {
    // Находим имя текущего персонажа
    let botName = $('.shadow_text-block').first().text() || $('.pe-character-name').text() || $('#nav-bar .character-name').text() || 'Бот';
    botName = botName.trim().split('\n')[0];

    const savedText = localStorage.getItem('kink_' + botName) || '';

    const html = `
        <div style="background: #101016; border: 1px solid #ff4565; border-radius: 10px; padding: 15px; margin-top: 10px; font-family: sans-serif;">
            <p style="margin: 0 0 10px 0; font-size: 1em; color: #fff;">🌶️ Заметки для: <b style="color: #ff4565;">${botName}</b></p>
            <textarea id="kink-menu-text" style="width: 100%; height: 120px; background: #1a1a24; color: #fff; border: 1px solid #333; border-radius: 6px; padding: 8px; font-size: 0.95em; resize: none; box-sizing: border-box; outline: none;" placeholder="Впиши сюда кинки, важные нюансы или стоп-слова персонажа...">${savedText}</textarea>
            <button id="save-kink-menu" style="width: 100%; margin-top: 10px; background: #ff4565; color: #fff; border: none; padding: 8px; border-radius: 6px; font-size: 0.95em; font-weight: bold; cursor: pointer;">Сохранить изменения</button>
        </div>
    `;

    container.append(html);

    // Логика кнопки сохранения
    $(document).off('click', '#save-kink-menu').on('click', '#save-kink-menu', function() {
        const text = $('#kink-menu-text').val();
        localStorage.setItem('kink_' + botName, text);
        $(this).text('Успешно сохранено! ✓').css('background', '#28a745');
        setTimeout(() => { 
            $('#save-kink-menu').text('Сохранить изменения').css('background', '#ff4565'); 
        }, 1500);
    });
}

// Регистрируем модуль в интерфейсе расширений SillyTavern
jQuery(async () => {
    // ST автоматически вызывает эту функцию и передает в неё контейнер модуля в настройках
    const moduleName = 'kink-reminder';
    
    // Каждую секунду проверяем, открыл ли пользователь меню расширений
    setInterval(() => {
        const container = $(`[data-extension="${moduleName}"] .extension_container, #${moduleName}_container`);
        if (container.length > 0 && $('#kink-menu-text').length === 0) {
            initKinkSettings(container);
        }
    }, 1000);
});
