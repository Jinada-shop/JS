// netlify/functions/bot.js
exports.handler = async (event) => {
  // Разрешаем только POST-запросы от Telegram
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Просто возвращаем успешный ответ, чтобы Telegram понял, что запрос принят
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'ok' })
  };
};
