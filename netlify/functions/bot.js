// netlify/functions/bot.js
// АДМИН-ПАНЕЛЬ В TELEGRAM ДЛЯ JINADA SHOP

const userStates = {};

exports.handler = async (event) => {
  const BOT_TOKEN = "8602701116:AAG2v1a9olDgOw_ytmBTL0SMdELPHADE1Go";
  const GITHUB_TOKEN = "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";
  const REPO_OWNER = "Jinada-shop";
  const REPO_NAME = "js";
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
    userStates[chatId] = { step: 'idle', product: {}, editMode: false, editProductId: null };
  }
  
  const state = userStates[chatId];
  
  // ========== ОБРАБОТКА КОМАНД ==========
  
  // /start
  if (text === '/start') {
    state.step = 'idle';
    await sendMessage(chatId, BOT_TOKEN, 
      "👑 <b>JINADA АДМИН-ПАНЕЛЬ</b>\n\n" +
      "📋 <b>Команды для управления товарами:</b>\n" +
      "━━━━━━━━━━━━━━━━━━━━━\n" +
      "➕ <code>/add</code> - добавить товар\n" +
      "📋 <code>/list</code> - список товаров\n" +
      "👁️ <code>/view [ID]</code> - посмотреть товар\n" +
      "✏️ <code>/edit [ID]</code> - редактировать товар\n" +
      "🗑️ <code>/del [ID]</code> - удалить товар\n" +
      "📊 <code>/stats</code> - статистика\n" +
      "❓ <code>/help</code> - помощь\n\n" +
      "Пример: <code>/view 5</code> - показать товар с ID 5"
    );
  }
  
  // /help
  else if (text === '/help') {
    await sendMessage(chatId, BOT_TOKEN,
      "📖 <b>Подробная справка</b>\n\n" +
      "<b>Просмотр и редактирование:</b>\n" +
      "<code>/view 5</code> - посмотреть товар ID 5\n" +
      "<code>/edit 5</code> - начать редактирование ID 5\n\n" +
      "<b>Быстрое редактирование:</b>\n" +
      "<code>/editname 5 Новое название</code>\n" +
      "<code>/editprice 5 2990</code>\n" +
      "<code>/editstock 5 50</code>\n" +
      "<code>/editdesc 5 Новое описание</code>\n\n" +
      "<b>Размеры:</b>\n" +
      "<code>/addsize 5 XL</code>\n" +
      "<code>/removesize 5 M</code>\n\n" +
      "<b>Цвета:</b>\n" +
      "<code>/addcolor 5 Синий #0000FF</code>\n" +
      "<code>/removecolor 5 Синий</code>\n\n" +
      "<b>Удаление:</b>\n" +
      "<code>/del 5</code> - удалить товар"
    );
  }
  
  // /add - начать добавление товара
  else if (text === '/add') {
    state.step = 'awaiting_name';
    state.product = {};
    state.editMode = false;
    await sendMessage(chatId, BOT_TOKEN, "📦 <b>Введите название товара:</b>");
  }
  
  // /list - показать список товаров
  else if (text === '/list') {
    const products = await getProductsFromGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (products.length > 0) {
      let msg = "📋 <b>Список товаров</b>\n━━━━━━━━━━━━━━━━━━━━━\n";
      for (const p of products) {
        const stockIcon = p.stock > 0 ? (p.stock < 5 ? '⚠️' : '✅') : '❌';
        msg += `${stockIcon} <b>${p.id}</b> — ${p.name} — ${p.price} ₽\n`;
      }
      msg += "\n━━━━━━━━━━━━━━━━━━━━━\nИспользуйте <code>/view ID</code> для деталей";
      await sendMessage(chatId, BOT_TOKEN, msg);
    } else {
      await sendMessage(chatId, BOT_TOKEN, "📭 <b>Товаров пока нет</b>\n\nДобавьте первый товар командой /add");
    }
  }
  
  // /view [ID] - посмотреть товар подробно
  else if (text && text.match(/^\/view \d+$/)) {
    const id = parseInt(text.split(' ')[1]);
    const products = await getProductsFromGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    const product = products.find(p => p.id === id);
    
    if (product) {
      const categoryName = getCategoryName(product.category);
      const stockStatus = product.stock > 0 ? (product.stock < 5 ? `⚠️ Осталось ${product.stock} шт.` : `✅ ${product.stock} шт.`) : '❌ Нет в наличии';
      const colorsList = product.colors.map(c => `🎨 ${c.name}`).join('\n');
      const sizesList = product.sizes.length > 0 ? product.sizes.join(', ') : 'нет';
      
      await sendMessage(chatId, BOT_TOKEN,
        `🔍 <b>ТОВАР #${product.id}</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 <b>Название:</b> ${product.name}\n` +
        `💰 <b>Цена:</b> ${product.price} ₽\n` +
        `📁 <b>Категория:</b> ${categoryName}\n` +
        `📦 <b>Наличие:</b> ${stockStatus}\n` +
        `🎨 <b>Цвета:</b>\n${colorsList}\n` +
        `📏 <b>Размеры:</b> ${sizesList}\n` +
        `📝 <b>Описание:</b> ${product.desc || '—'}\n` +
        `🆔 <b>Код:</b> ${product.code}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `✏️ <code>/edit ${id}</code> - редактировать\n` +
        `🗑️ <code>/del ${id}</code> - удалить`
      );
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Товар с ID ${id} не найден`);
    }
  }
  
  // /edit [ID] - начать редактирование
  else if (text && text.match(/^\/edit \d+$/)) {
    const id = parseInt(text.split(' ')[1]);
    const products = await getProductsFromGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    const product = products.find(p => p.id === id);
    
    if (product) {
      state.editMode = true;
      state.editProductId = id;
      state.editProduct = { ...product };
      state.step = 'edit_menu';
      
      await sendMessage(chatId, BOT_TOKEN,
        `✏️ <b>Редактирование товара #${id}</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 ${product.name}\n💰 ${product.price} ₽\n\n` +
        `<b>Что хотите изменить?</b>\n\n` +
        `1️⃣ Название\n` +
        `2️⃣ Цену\n` +
        `3️⃣ Количество на складе\n` +
        `4️⃣ Описание\n` +
        `5️⃣ Размеры\n` +
        `6️⃣ Цвета\n` +
        `7️⃣ Категорию\n\n` +
        `Введите номер или /cancel для отмены`
      );
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Товар с ID ${id} не найден`);
    }
  }
  
  // Быстрое редактирование: /editname ID Название
  else if (text && text.match(/^\/editname \d+ .+/)) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const newName = parts.slice(2).join(' ');
    const result = await updateProductField(id, 'name', newName, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      await sendMessage(chatId, BOT_TOKEN, `✅ Название изменено на: <b>${newName}</b>`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Ошибка: ${result.error}`);
    }
  }
  
  // /editprice ID Цена
  else if (text && text.match(/^\/editprice \d+ \d+$/)) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const newPrice = parseInt(parts[2]);
    const result = await updateProductField(id, 'price', newPrice, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      await sendMessage(chatId, BOT_TOKEN, `✅ Цена изменена на: <b>${newPrice} ₽</b>`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Ошибка: ${result.error}`);
    }
  }
  
  // /editstock ID Количество
  else if (text && text.match(/^\/editstock \d+ \d+$/)) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const newStock = parseInt(parts[2]);
    const result = await updateProductField(id, 'stock', newStock, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      const status = newStock > 0 ? (newStock < 5 ? `⚠️ Осталось ${newStock} шт.` : `✅ ${newStock} шт.`) : '❌ Нет в наличии';
      await sendMessage(chatId, BOT_TOKEN, `✅ Количество изменено: <b>${status}</b>`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Ошибка: ${result.error}`);
    }
  }
  
  // /editdesc ID Описание
  else if (text && text.match(/^\/editdesc \d+ .+/)) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const newDesc = parts.slice(2).join(' ');
    const result = await updateProductField(id, 'desc', newDesc, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      await sendMessage(chatId, BOT_TOKEN, `✅ Описание изменено:\n\n<i>${newDesc}</i>`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Ошибка: ${result.error}`);
    }
  }
  
  // /addsize ID Размер
  else if (text && text.match(/^\/addsize \d+ \w+$/)) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const newSize = parts[2].toUpperCase();
    const result = await addSizeToProduct(id, newSize, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      await sendMessage(chatId, BOT_TOKEN, `✅ Размер <b>${newSize}</b> добавлен`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ ${result.error}`);
    }
  }
  
  // /removesize ID Размер
  else if (text && text.match(/^\/removesize \d+ \w+$/)) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const removeSize = parts[2].toUpperCase();
    const result = await removeSizeFromProduct(id, removeSize, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      await sendMessage(chatId, BOT_TOKEN, `✅ Размер <b>${removeSize}</b> удалён`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ ${result.error}`);
    }
  }
  
  // /addcolor ID Название #HEX
  else if (text && text.match(/^\/addcolor \d+ .+ #[\da-fA-F]{6}$/)) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const colorName = parts[2];
    const colorCode = parts[3];
    const result = await addColorToProduct(id, colorName, colorCode, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      await sendMessage(chatId, BOT_TOKEN, `✅ Цвет <b>${colorName}</b> добавлен`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ ${result.error}`);
    }
  }
  
  // /removecolor ID Название
  else if (text && text.match(/^\/removecolor \d+ .+/)) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const colorName = parts.slice(2).join(' ');
    const result = await removeColorFromProduct(id, colorName, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      await sendMessage(chatId, BOT_TOKEN, `✅ Цвет <b>${colorName}</b> удалён`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ ${result.error}`);
    }
  }
  
  // /del ID - удалить товар
  else if (text && text.match(/^\/del \d+$/)) {
    const id = parseInt(text.split(' ')[1]);
    const product = await getProductById(id, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (product) {
      await sendMessage(chatId, BOT_TOKEN, `⚠️ Вы уверены, что хотите удалить товар <b>${product.name}</b>?\n\nОтправьте <code>/delconfirm ${id}</code> для подтверждения`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Товар с ID ${id} не найден`);
    }
  }
  
  // /delconfirm ID - подтверждение удаления
  else if (text && text.match(/^\/delconfirm \d+$/)) {
    const id = parseInt(text.split(' ')[1]);
    const result = await deleteProductFromGitHub(id, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    if (result.success) {
      await sendMessage(chatId, BOT_TOKEN, `✅ Товар ID ${id} удалён`);
    } else {
      await sendMessage(chatId, BOT_TOKEN, `❌ Товар ID ${id} не найден`);
    }
  }
  
  // /stats - статистика
  else if (text === '/stats') {
    const products = await getProductsFromGitHub(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock < 5).length;
    
    await sendMessage(chatId, BOT_TOKEN,
      `📊 <b>СТАТИСТИКА МАГАЗИНА</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 <b>Всего товаров:</b> ${products.length}\n` +
      `💰 <b>Общая стоимость:</b> ${totalValue.toLocaleString()} ₽\n` +
      `📦 <b>Всего единиц:</b> ${totalStock} шт.\n` +
      `❌ <b>Нет в наличии:</b> ${outOfStock}\n` +
      `⚠️ <b>Остаток <5 шт.:</b> ${lowStock}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏆 <b>JINADA PREMIUM</b>`
    );
  }
  
  // /cancel - отмена
  else if (text === '/cancel') {
    state.step = 'idle';
    state.editMode = false;
    state.product = {};
    await sendMessage(chatId, BOT_TOKEN, "❌ Действие отменено");
  }
  
  // Обработка фото при добавлении товара
  else if (photo && state.step === 'awaiting_photos') {
    const fileId = photo[photo.length - 1].file_id;
    const imageUrl = await getTelegramFileUrl(fileId, BOT_TOKEN);
    
    if (!state.product.colors[state.currentColorIndex].photos) {
      state.product.colors[state.currentColorIndex].photos = [];
    }
    state.product.colors[state.currentColorIndex].photos.push(imageUrl);
    
    await sendMessage(chatId, BOT_TOKEN, 
      `📸 Фото добавлено! (${state.product.colors[state.currentColorIndex].photos.length}/10)\n` +
      `Отправьте ещё фото или /nextcolor`
    );
  }
  
  // Обработка текстовых шагов
  else if (text && text !== '/cancel' && text !== '/nextcolor' && state.step !== 'idle') {
    await handleProductCreation(text, state, chatId, BOT_TOKEN, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
  }
  
  // Обработка /nextcolor
  else if (text === '/nextcolor' && state.step === 'awaiting_photos') {
    await handleNextColor(state, chatId, BOT_TOKEN, GITHUB_TOKEN, REPO_OWNER, REPO_NAME);
  }
  
  // Обработка меню редактирования
  else if (state.editMode && state.step === 'edit_menu' && text && text.match(/^[1-7]$/)) {
    await handleEditMenu(text, state, chatId, BOT_TOKEN);
  }
  
  // Обработка значений редактирования
  else if (state.editMode && state.step !== 'edit_menu' && state.step !== 'idle') {
    await handleEditValue(text, state, chatId, BOT_TOKEN, GITHUB_TOKEN, REPO_OWNER, REPO_NAME, PRODUCTS_FILE_PATH);
  }
  
  return { statusCode: 200, body: 'OK' };
};

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

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

async function getTelegramFileUrl(fileId, token) {
  const url = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
  const response = await fetch(url);
  const data = await response.json();
  const filePath = data.result.file_path;
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

function getCategoryName(category) {
  const names = {
    'men': '👔 Мужское',
    'women': '🌸 Женское',
    'accessories': '🕶️ Аксессуары',
    'kids': '🧸 Детское',
    'jinada': '✨ Jinada Style'
  };
  return names[category] || category;
}

function getCategoryFolder(category) {
  const folderMap = {
    'men': 'men', 'women': 'women', 'accessories': 'accessories',
    'kids': 'kids', 'jinada': 'jinada'
  };
  return folderMap[category] || 'other';
}

function getColorCode(colorName) {
  const colorMap = {
    'черный': '#000000', 'белый': '#FFFFFF', 'красный': '#FF0000',
    'синий': '#0000FF', 'зеленый': '#008000', 'желтый': '#FFFF00',
    'розовый': '#FFC0CB', 'серый': '#808080', 'коричневый': '#8B4513',
    'фиолетовый': '#800080', 'оранжевый': '#FFA500', 'шоколадный': '#7B3F00'
  };
  return colorMap[colorName.toLowerCase()] || '#808080';
}

async function getProductsFromGitHub(token, owner, repo, filePath) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${token}` }
    });
    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    const json = JSON.parse(content);
    return json.products || [];
  } catch(e) {
    return [];
  }
}

async function saveProductsToGitHub(products, token, owner, repo, filePath, commitMessage) {
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
      message: commitMessage || 'Обновление товаров',
      content: encodedContent,
      sha: fileData.sha
    })
  });
  
  return response.ok;
}

async function getProductById(id, token, owner, repo, filePath) {
  const products = await getProductsFromGitHub(token, owner, repo, filePath);
  return products.find(p => p.id === id);
}

async function updateProductField(id, field, value, token, owner, repo, filePath) {
  try {
    const products = await getProductsFromGitHub(token, owner, repo, filePath);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Товар не найден' };
    
    products[index][field] = value;
    await saveProductsToGitHub(products, token, owner, repo, filePath, `Обновлено поле ${field} для товара ${id}`);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function addSizeToProduct(id, size, token, owner, repo, filePath) {
  try {
    const products = await getProductsFromGitHub(token, owner, repo, filePath);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Товар не найден' };
    
    if (!products[index].sizes) products[index].sizes = [];
    if (products[index].sizes.includes(size)) {
      return { success: false, error: 'Размер уже существует' };
    }
    
    products[index].sizes.push(size);
    products[index].sizes.sort();
    await saveProductsToGitHub(products, token, owner, repo, filePath, `Добавлен размер ${size} к товару ${id}`);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function removeSizeFromProduct(id, size, token, owner, repo, filePath) {
  try {
    const products = await getProductsFromGitHub(token, owner, repo, filePath);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Товар не найден' };
    
    products[index].sizes = products[index].sizes.filter(s => s !== size);
    await saveProductsToGitHub(products, token, owner, repo, filePath, `Удалён размер ${size} у товара ${id}`);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function addColorToProduct(id, colorName, colorCode, token, owner, repo, filePath) {
  try {
    const products = await getProductsFromGitHub(token, owner, repo, filePath);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Товар не найден' };
    
    if (products[index].colors.some(c => c.name === colorName)) {
      return { success: false, error: 'Цвет уже существует' };
    }
    
    products[index].colors.push({
      name: colorName,
      code: colorCode,
      img: `https://placehold.co/600x800/${colorCode.replace('#', '')}/white?text=${encodeURIComponent(colorName)}`,
      gallery: []
    });
    
    await saveProductsToGitHub(products, token, owner, repo, filePath, `Добавлен цвет ${colorName} к товару ${id}`);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function removeColorFromProduct(id, colorName, token, owner, repo, filePath) {
  try {
    const products = await getProductsFromGitHub(token, owner, repo, filePath);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return { success: false, error: 'Товар не найден' };
    
    products[index].colors = products[index].colors.filter(c => c.name !== colorName);
    if (products[index].colors.length === 0) {
      products[index].colors = [{
        name: "Стандарт",
        code: "#808080",
        img: "https://placehold.co/600x800/808080/white?text=JINADA",
        gallery: []
      }];
    }
    
    await saveProductsToGitHub(products, token, owner, repo, filePath, `Удалён цвет ${colorName} у товара ${id}`);
    return { success: true };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function deleteProductFromGitHub(id, token, owner, repo, filePath) {
  try {
    let products = await getProductsFromGitHub(token, owner, repo, filePath);
    const newProducts = products.filter(p => p.id !== id);
    
    if (newProducts.length === products.length) {
      return { success: false };
    }
    
    const renumbered = newProducts.map((p, idx) => ({
      ...p,
      id: idx + 1,
      code: `JIN-${String(idx + 1).padStart(3, '0')}`
    }));
    
    await saveProductsToGitHub(renumbered, token, owner, repo, filePath, `Удалён товар ID ${id}`);
    return { success: true };
  } catch(e) {
    return { success: false };
  }
}

// Функции для пошагового создания товара
async function handleProductCreation(text, state, chatId, botToken, gitToken, owner, repo, filePath) {
  switch (state.step) {
    case 'awaiting_name':
      state.product.name = text;
      state.step = 'awaiting_price';
      await sendMessage(chatId, botToken, "💰 Введите цену (₽):");
      break;
      
    case 'awaiting_price':
      const price = parseInt(text);
      if (isNaN(price) || price <= 0) {
        await sendMessage(chatId, botToken, "❌ Введите корректную цену:");
      } else {
        state.product.price = price;
        state.step = 'awaiting_category';
        await sendMessage(chatId, botToken,
          "📁 Выберите категорию:\n" +
          "1️⃣ Мужское (men)\n" +
          "2️⃣ Женское (women)\n" +
          "3️⃣ Аксессуары (accessories)\n" +
          "4️⃣ Детское (kids)\n" +
          "5️⃣ Jinada Style (jinada)\n\n" +
          "Введите номер:");
      }
      break;
      
    case 'awaiting_category':
      const categoryMap = { '1': 'men', '2': 'women', '3': 'accessories', '4': 'kids', '5': 'jinada' };
      if (categoryMap[text]) {
        state.product.category = categoryMap[text];
        state.product.jinada = (categoryMap[text] === 'jinada');
        state.step = 'awaiting_desc';
        await sendMessage(chatId, botToken, "📝 Введите описание товара:");
      } else {
        await sendMessage(chatId, botToken, "❌ Введите номер от 1 до 5:");
      }
      break;
      
    case 'awaiting_desc':
      state.product.desc = text;
      state.step = 'awaiting_stock';
      await sendMessage(chatId, botToken, "📦 Введите количество на складе:");
      break;
      
    case 'awaiting_stock':
      const stock = parseInt(text);
      if (isNaN(stock) || stock < 0) {
        await sendMessage(chatId, botToken, "❌ Введите корректное число:");
      } else {
        state.product.stock = stock;
        state.step = 'awaiting_colors_count';
        await sendMessage(chatId, botToken,
          "🎨 Сколько цветов у товара?\n(введите число, 0 если нет)");
      }
      break;
      
    case 'awaiting_colors_count':
      const colorsCount = parseInt(text);
      if (isNaN(colorsCount) || colorsCount < 0) {
        await sendMessage(chatId, botToken, "❌ Введите число:");
      } else if (colorsCount === 0) {
        state.product.colors = [{
          name: "Стандарт",
          code: "#808080",
          img: "https://placehold.co/600x800/808080/white?text=JINADA",
          gallery: []
        }];
        state.step = 'awaiting_sizes';
        await sendMessage(chatId, botToken, "📏 Введите размеры через запятую\nПример: S, M, L, XL\n(0 если нет)");
      } else {
        state.product.colors = [];
        state.product.totalColors = colorsCount;
        state.currentColorIndex = 0;
        state.step = 'awaiting_color_name';
        await sendMessage(chatId, botToken, `🎨 Цвет #1 из ${colorsCount}\nВведите название цвета:`);
      }
      break;
      
    case 'awaiting_color_name':
      state.product.colors.push({
        name: text,
        code: getColorCode(text),
        img: "",
        gallery: [],
        photos: []
      });
      state.step = 'awaiting_photos';
      state.currentColorIndex = state.product.colors.length - 1;
      await sendMessage(chatId, botToken, `🖼️ Отправьте фото для цвета "${text}"\nКогда закончите, отправьте /nextcolor`);
      break;
      
    case 'awaiting_sizes':
      let sizes = [];
      if (text !== '0' && text.trim() !== '') {
        sizes = text.split(/[,，]+/).map(s => s.trim()).filter(s => s);
      }
      state.product.sizes = sizes;
      
      await sendMessage(chatId, botToken, "⏳ Сохраняю товар...");
      
      const products = await getProductsFromGitHub(gitToken, owner, repo, filePath);
      const newId = products.length + 1;
      
      const newProduct = {
        id: newId,
        code: `JIN-${String(newId).padStart(3, '0')}`,
        name: state.product.name,
        price: state.product.price,
        category: state.product.category,
        jinada: state.product.jinada || false,
        discount: 0,
        desc: state.product.desc || "Новый товар",
        stock: state.product.stock || 10,
        colors: state.product.colors.map(c => ({
          name: c.name,
          code: c.code,
          img: c.img || `https://placehold.co/600x800/${c.code.replace('#', '')}/white?text=${encodeURIComponent(c.name)}`,
          gallery: c.gallery || []
        })),
        sizes: state.product.sizes || []
      };
      
      products.push(newProduct);
      await saveProductsToGitHub(products, gitToken, owner, repo, filePath, `Добавлен товар: ${state.product.name}`);
      
      await sendMessage(chatId, botToken,
        `✅ <b>ТОВАР ДОБАВЛЕН!</b>\n\n` +
        `📦 ${state.product.name}\n` +
        `💰 ${state.product.price} ₽\n` +
        `📁 ${getCategoryName(state.product.category)}\n` +
        `📦 В наличии: ${state.product.stock} шт.\n` +
        `🎨 Цветов: ${state.product.colors.length}\n` +
        `📏 Размеры: ${sizes.length > 0 ? sizes.join(', ') : 'нет'}\n` +
        `🆔 ID: ${newId}\n\n` +
        `✨ Товар появится на сайте через 1-2 минуты`);
      
      state.step = 'idle';
      state.product = {};
      break;
  }
}

async function handleNextColor(state, chatId, botToken, gitToken, owner, repo) {
  const currentColor = state.product.colors[state.currentColorIndex];
  
  if (currentColor.photos && currentColor.photos.length > 0) {
    currentColor.img = currentColor.photos[0];
    currentColor.gallery = currentColor.photos;
  } else {
    currentColor.img = `https://placehold.co/600x800/${currentColor.code.replace('#', '')}/white?text=${encodeURIComponent(currentColor.name)}`;
    currentColor.gallery = [];
  }
  
  if (state.product.colors.length < state.product.totalColors) {
    state.currentColorIndex = state.product.colors.length;
    state.step = 'awaiting_color_name';
    await sendMessage(chatId, botToken,
      `🎨 Цвет #${state.currentColorIndex + 1} из ${state.product.totalColors}\nВведите название цвета:`);
  } else {
    state.step = 'awaiting_sizes';
    await sendMessage(chatId, botToken, "📏 Введите размеры через запятую\nПример: S, M, L, XL\n(0 если нет)");
  }
}

async function handleEditMenu(choice, state, chatId, botToken) {
  const fields = {
    '1': { name: 'название', step: 'edit_name', prompt: '📦 Введите новое название:' },
    '2': { name: 'цену', step: 'edit_price', prompt: '💰 Введите новую цену (₽):' },
    '3': { name: 'количество', step: 'edit_stock', prompt: '📦 Введите новое количество на складе:' },
    '4': { name: 'описание', step: 'edit_desc', prompt: '📝 Введите новое описание:' },
    '5': { name: 'размеры', step: 'edit_sizes', prompt: '📏 Введите новые размеры через запятую\nПример: S, M, L, XL' },
    '6': { name: 'цвета', step: 'edit_colors', prompt: '🎨 Управление цветами:\n/addcolor ID Название #HEX\n/removecolor ID Название' },
    '7': { name: 'категорию', step: 'edit_category', prompt: '📁 Выберите новую категорию:\n1 Мужское\n2 Женское\n3 Аксессуары\n4 Детское\n5 Jinada Style' }
  };
  
  const field = fields[choice];
  if (field) {
    if (choice === '6') {
      await sendMessage(chatId, botToken, field.prompt);
      state.step = 'idle';
      state.editMode = false;
    } else {
      state.editStep = field.step;
      state.step = field.step;
      await sendMessage(chatId, botToken, field.prompt);
    }
  }
}

async function handleEditValue(text, state, chatId, botToken, gitToken, owner, repo, filePath) {
  let result;
  
  switch (state.editStep) {
    case 'edit_name':
      result = await updateProductField(state.editProductId, 'name', text, gitToken, owner, repo, filePath);
      if (result.success) await sendMessage(chatId, botToken, `✅ Название изменено на: <b>${text}</b>`);
      else await sendMessage(chatId, botToken, `❌ Ошибка: ${result.error}`);
      break;
      
    case 'edit_price':
      const price = parseInt(text);
      if (isNaN(price) || price <= 0) {
        await sendMessage(chatId, botToken, "❌ Введите корректную цену");
        return;
      }
      result = await updateProductField(state.editProductId, 'price', price, gitToken, owner, repo, filePath);
      if (result.success) await sendMessage(chatId, botToken, `✅ Цена изменена на: <b>${price} ₽</b>`);
      else await sendMessage(chatId, botToken, `❌ Ошибка: ${result.error}`);
      break;
      
    case 'edit_stock':
      const stock = parseInt(text);
      if (isNaN(stock) || stock < 0) {
        await sendMessage(chatId, botToken, "❌ Введите корректное количество");
        return;
      }
      result = await updateProductField(state.editProductId, 'stock', stock, gitToken, owner, repo, filePath);
      if (result.success) await sendMessage(chatId, botToken, `✅ Количество изменено на: <b>${stock} шт.</b>`);
      else await sendMessage(chatId, botToken, `❌ Ошибка: ${result.error}`);
      break;
      
    case 'edit_desc':
      result = await updateProductField(state.editProductId, 'desc', text, gitToken, owner, repo, filePath);
      if (result.success) await sendMessage(chatId, botToken, `✅ Описание изменено`);
      else await sendMessage(chatId, botToken, `❌ Ошибка: ${result.error}`);
      break;
      
    case 'edit_sizes':
      const sizes = text === '0' ? [] : text.split(/[,，]+/).map(s => s.trim()).filter(s => s);
      result = await updateProductField(state.editProductId, 'sizes', sizes, gitToken, owner, repo, filePath);
      if (result.success) await sendMessage(chatId, botToken, `✅ Размеры изменены: ${sizes.length > 0 ? sizes.join(', ') : 'нет'}`);
      else await sendMessage(chatId, botToken, `❌ Ошибка: ${result.error}`);
      break;
      
    case 'edit_category':
      const categoryMap = { '1': 'men', '2': 'women', '3': 'accessories', '4': 'kids', '5': 'jinada' };
      if (categoryMap[text]) {
        result = await updateProductField(state.editProductId, 'category', categoryMap[text], gitToken, owner, repo, filePath);
        if (result.success) await sendMessage(chatId, botToken, `✅ Категория изменена на: ${getCategoryName(categoryMap[text])}`);
        else await sendMessage(chatId, botToken, `❌ Ошибка: ${result.error}`);
      } else {
        await sendMessage(chatId, botToken, "❌ Введите номер от 1 до 5");
        return;
      }
      break;
  }
  
  state.step = 'idle';
  state.editMode = false;
  state.editProductId = null;
  state.editStep = null;
}
