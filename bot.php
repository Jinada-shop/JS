<?php
// bot.php - Обработчик сообщений Telegram бота
// Установите этот файл на ваш хостинг и настройте webhook

$botToken = '8782295780:AAHF4MjiHMENwBv4TxSLMsNpeQ9uF6RuOEo';
$adminId = '1497713648';

$update = json_decode(file_get_contents('php://input'), true);

if (isset($update['message'])) {
    $chatId = $update['message']['chat']['id'];
    $text = $update['message']['text'];
    $username = $update['message']['from']['username'] ?? 'нет username';
    $firstName = $update['message']['from']['first_name'] ?? '';
    
    // Обработка команды /start
    if (strpos($text, '/start') === 0) {
        // Извлекаем ID заказа из команды /start order_JIN-XXX
        if (strpos($text, 'order_') !== false) {
            $orderId = str_replace('/start order_', '', $text);
            sendMessage($chatId, "👑 Добро пожаловать в JINADA!\n\nВаш заказ: $orderId\n\n📌 Отправьте фото чека об оплате.\n📌 Укажите номер заказа в комментарии.\n\nПосле проверки мы подтвердим заказ.");
        } else {
            sendMessage($chatId, "👑 Добро пожаловать в JINADA!\n\nЯ бот для подтверждения заказов.\n\n📌 Отправьте чек об оплате\n📌 Укажите номер заказа\n\nАдминистратор проверит оплату и подтвердит заказ.");
        }
        return;
    }
    
    // Обработка фото (чека)
    if (isset($update['message']['photo'])) {
        $photo = end($update['message']['photo']);
        $fileId = $photo['file_id'];
        
        // Получаем файл
        $file = file_get_contents("https://api.telegram.org/bot{$botToken}/getFile?file_id={$fileId}");
        $fileData = json_decode($file, true);
        $filePath = $fileData['result']['file_path'];
        $fileUrl = "https://api.telegram.org/file/bot{$botToken}/{$filePath}";
        
        // Отправляем чек админу
        $caption = "🆕 НОВЫЙ ЧЕК ДЛЯ ПОДТВЕРЖДЕНИЯ!\n\n👤 Пользователь: @{$username} ({$firstName})\n📅 Дата: " . date('d.m.Y H:i:s');
        
        // Отправляем фото админу
        sendPhoto($adminId, $fileUrl, $caption);
        
        // Отвечаем пользователю
        sendMessage($chatId, "✅ Чек получен! Администратор проверит оплату и подтвердит заказ в ближайшее время.\n\nСтатус заказа можно проверить командой /status");
        return;
    }
    
    // Обработка текстовых сообщений (номер заказа)
    if (preg_match('/JIN-\d+/', $text)) {
        $orderId = $text;
        
        // Проверяем статус заказа (нужно подключение к БД или чтение файла)
        // Здесь можно добавить проверку статуса заказа
        
        sendMessage($chatId, "📦 Заказ: $orderId\n\n⏳ Статус: ожидает подтверждения оплаты\n\nПосле подтверждения мы уведомим вас.");
        return;
    }
    
    // Команда /status - проверка статуса
    if ($text === '/status') {
        sendMessage($chatId, "🔍 Введите номер заказа для проверки статуса (например: JIN-12345678)");
        return;
    }
    
    // Пересылаем админу текстовое сообщение от пользователя
    sendMessage($adminId, "💬 Сообщение от @{$username}:\n\n{$text}");
    sendMessage($chatId, "✅ Сообщение отправлено администратору. Ожидайте ответа.");
}

// Функция отправки сообщения
function sendMessage($chatId, $message) {
    global $botToken;
    $url = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $post = http_build_query([
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'HTML'
    ]);
    file_get_contents($url . '?' . $post);
}

// Функция отправки фото
function sendPhoto($chatId, $photoUrl, $caption = '') {
    global $botToken;
    $url = "https://api.telegram.org/bot{$botToken}/sendPhoto";
    $post = http_build_query([
        'chat_id' => $chatId,
        'photo' => $photoUrl,
        'caption' => $caption
    ]);
    file_get_contents($url . '?' . $post);
}
?>