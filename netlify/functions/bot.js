// netlify/functions/bot.js
const userStates = {};

exports.handler = async (event) => {
  const BOT_TOKEN = "8602701116:AAG2v1a9olDgOw_ytmBTL0SMdELPHADE1Go";
  const GITHUB_TOKEN = "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";
  const REPO_OWNER = "jinada-shop";
  const REPO_NAME = "JS";
  const PRODUCTS_FILE_PATH = "products.json";
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const update = JSON.parse(event.body);
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();
  const photo = update.message?.photo;
  
  if (!chatId) return { statusCode: 200, body: 'OK' };
  
  if (!userStates[chatId]) {
    userStates[chatId] = { step: 'idle', product: {} };
  }
  
  const state = userStates[chatId];
  
  // Команды
  if (text === '/start') {
    state.step = 'idle';
    await sendMessage(chatId, BOT_TOKEN, 
      "👑 БОТ УПРАВЛЕНИЯ JINADA\n\n" +
      "✅ Бот работает!\n\n" +
      "📋 Команды:\n" +
      "/add — добавить товар\n" +
      "/list — список товаров\n" +
      "/view [ID] — посмотреть товар\n" +
      "/stats — статистика\n" +
      "/cancel — отмена"
    );
  }
  else if (text === '/list') {
    const products = await getProductsFromGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (products.length > 0) {
      let msg = "📋 СПИСОК ТОВАРОВ:\n\n";
      for (const p of products.slice(0, 20)) {
        msg += `🆔 ${p.id} — ${p.name} — ${p.price} ₽\n`;
      }
      if (products.length > 20) msg += `\n... и ещё ${products.length - 20} товаров`;
      await sendMessage(chatId, BOT_TOKEN, msg);
    } else {
      await sendMessage(chatId, BOT_TOKEN, "📭 Товаров пока нет");
    }
  }
  else if (text && text.match(/^\/view \d+$/)) {
    const id = parseInt(text.split(' ')[1]);
    const products = await getProductsFromGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    const product = products.find(p => p.id === id);
    if (product) {
      await sendMessage(chatId, BOT_TOKEN,
        `🔍 ТОВАР #${product.id}\n\n` +
        `📦 ${product.name}\n` +
        `💰 ${product.price} ₽\n` +
        `📁 ${product.category}\n` +
        `📦 В наличии: ${product.stock} шт.\n` +
        `📝 ${product.desc || '—'}`
      );
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Товар с ID ${id} не найден`);
    }
  }
  else if (text === '/stats') {
    const products = await getProductsFromGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    await sendMessage(chatId, BOT_TOKEN,
      `📊 СТАТИСТИКА\n\n` +
      `📦 Товаров: ${products.length}\n` +
      `💰 Общая стоимость: ${totalValue.toLocaleString()} ₽`
    );
  }
  else if (text === '/cancel') {
    state.step = 'idle';
    state.product = {};
    await sendMessage(chatId, BOT_TOKEN, "❌ Действие отменено");
  }
  else if (text === '/add') {
    state.step = 'awaiting_name';
    state.product = {};
    await sendMessage(chatId, BOT_TOKEN, "📦 Введите НАЗВАНИЕ товара:");
  }
  else if (state.step === 'awaiting_name') {
    state.product.name = text;
    state.step = 'awaiting_price';
    await sendMessage(chatId, BOT_TOKEN, "💰 Введите ЦЕНУ (₽):");
  }
  else if (state.step === 'awaiting_price') {
    const price = parseInt(text);
    if (isNaN(price) || price <= 0) {
      await sendMessage(chatId, BOT_TOKEN, "❌ Введите корректную цену:");
    } else {
      state.product.price = price;
      state.step = 'awaiting_category';
      await sendMessage(chatId, BOT_TOKEN,
        "📁 Выберите КАТЕГОРИЮ:\n" +
        "1 — Мужское (men)\n" +
        "2 — Женское (women)\n" +
        "3 — Аксессуары (accessories)\n" +
        "4 — Детское (kids)\n" +
        "5 — Jinada Style (jinada)\n\n" +
        "Введите номер 1-5:"
      );
    }
  }
  else if (state.step === 'awaiting_category') {
    const categoryMap = { '1': 'men', '2': 'women', '3': 'accessories', '4': 'kids', '5': 'jinada' };
    if (categoryMap[text]) {
      state.product.category = categoryMap[text];
      state.step = 'awaiting_desc';
      await sendMessage(chatId, BOT_TOKEN, "📝 Введите ОПИСАНИЕ товара:");
    } else {
      await sendMessage(chatId, BOT_TOKEN, "❌ Введите номер от 1 до 5:");
    }
  }
  else if (state.step === 'awaiting_desc') {
    state.product.desc = text;
    state.step = 'awaiting_stock';
    await sendMessage(chatId, BOT_TOKEN, "📦 Введите КОЛИЧЕСТВО на складе:");
  }
  else if (state.step === 'awaiting_stock') {
    const stock = parseInt(text);
    if (isNaN(stock) || stock < 0) {
      await sendMessage(chatId, BOT_TOKEN, "❌ Введите корректное число:");
    } else {
      state.product.stock = stock;
      
      // Сохраняем товар
      const products = await getProductsFromGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
      const newId = products.length + 1;
      
      const newProduct = {
        id: newId,
        code: `JIN-${String(newId).padStart(3, '0')}`,
        name: state.product.name,
        price: state.product.price,
        category: state.product.category,
        jinada: state.product.category === 'jinada',
        discount: 0,
        desc: state.product.desc || "Новый товар",
        stock: state.product.stock,
        colors: [{
          name: "Стандарт",
          code: "#808080",
          img: "https://placehold.co/600x800/808080/white?text=JINADA",
          gallery: []
        }],
        sizes: ["S", "M", "L", "XL"]
      };
      
      products.push(newProduct);
      const saved = await saveProductsToGitHub(products, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH, `Добавлен товар: ${state.product.name}`);
      
      if (saved) {
        await sendMessage(chatId, BOT_TOKEN,
          `✅ ТОВАР ДОБАВЛЕН!\n\n` +
          `📦 ${state.product.name}\n` +
          `💰 ${state.product.price} ₽\n` +
          `📁 ${state.product.category}\n` +
          `📦 В наличии: ${state.product.stock} шт.\n` +
          `🆔 ID: ${newId}\n\n` +
          `✨ Товар появится на сайте через 1-2 минуты`
        );
      } else {
        await sendMessage(chatId, BOT_TOKEN, "❌ Ошибка при сохранении товара");
      }
      
      state.step = 'idle';
      state.product = {};
    }
  }
  else {
    await sendMessage(chatId, BOT_TOKEN, "❓ Неизвестная команда. Напишите /start");
  }
  
  return { statusCode: 200, body: 'OK' };
};

// ============ ФУНКЦИИ ДЛЯ РАБОТЫ С GITHUB ============

async function sendMessage(chatId, token, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
    });
  } catch(e) {}
}

async function getProductsFromGitHub(token, owner, repo, filePath) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${token}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    const json = JSON.parse(content);
    return json.products || [];
  } catch(e) {
    return [];
  }
}

async function saveProductsToGitHub(products, token, owner, repo, filePath, message) {
  try {
    const updatedContent = JSON.stringify({ products: products }, null, 2);
    const encodedContent = Buffer.from(updatedContent).toString('base64');
    
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const getResponse = await fetch(url, {
      headers: { 'Authorization': `token ${token}` }
    });
    const fileData = await getResponse.json();
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message || 'Обновление товаров',
        content: encodedContent,
        sha: fileData.sha
      })
    });
    
    return response.ok;
  } catch(e) {
    return false;
  }
}
