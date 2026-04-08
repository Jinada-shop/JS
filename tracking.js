// tracking.js - сбор статистики на сайте
const trackingData = {
    visits: JSON.parse(localStorage.getItem('tracking_visits') || '[]'),
    devices: JSON.parse(localStorage.getItem('tracking_devices') || '{}'),
    sources: JSON.parse(localStorage.getItem('tracking_sources') || '[]')
};

// Определение устройства
function getDeviceInfo() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'Tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'Mobile';
    return 'Desktop';
}

// Определение браузера
function getBrowserInfo() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Other';
}

// Определение источника
function getTrafficSource() {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = document.referrer;
    
    if (urlParams.has('utm_source')) return urlParams.get('utm_source');
    if (ref.includes('google')) return 'Google';
    if (ref.includes('yandex')) return 'Yandex';
    if (ref.includes('t.me') || ref.includes('telegram')) return 'Telegram';
    if (ref.includes('vk.com') || ref.includes('vkontakte')) return 'VK';
    if (ref.includes('instagram')) return 'Instagram';
    if (ref === '') return 'Direct';
    return 'Referral';
}

// Сохранение визита
function trackVisit() {
    const visit = {
        id: Date.now(),
        date: new Date().toISOString(),
        device: getDeviceInfo(),
        browser: getBrowserInfo(),
        source: getTrafficSource(),
        page: window.location.pathname,
        referrer: document.referrer,
        utm: JSON.parse(localStorage.getItem('utm_data') || '{}')
    };
    
    trackingData.visits.push(visit);
    localStorage.setItem('tracking_visits', JSON.stringify(trackingData.visits.slice(-1000)));
    
    // Обновляем статистику устройств
    trackingData.devices[visit.device] = (trackingData.devices[visit.device] || 0) + 1;
    localStorage.setItem('tracking_devices', JSON.stringify(trackingData.devices));
    
    // Обновляем статистику источников
    trackingData.sources.push({ source: visit.source, date: visit.date });
    localStorage.setItem('tracking_sources', JSON.stringify(trackingData.sources));
}

// Вызываем при загрузке страницы
trackVisit();