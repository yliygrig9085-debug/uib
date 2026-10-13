/* ============================================================
   Трансляция новостей из группы ВКонтакте на сайт АНО «КАМА»
   ------------------------------------------------------------
   РЕЖИМ 1 (рекомендуется): через Cloudflare Worker-прокси.
     Укажите адрес вашего воркера в proxyUrl.
   РЕЖИМ 2 (простой, но менее безопасный): напрямую из браузера
     с сервисным токеном ВК. Токен будет виден всем в коде
     страницы — VK может его заблокировать при злоупотреблении.
   ============================================================ */
const NEWS_CONFIG = {
  proxyUrl: 'https://ano-kama-news.YOUR-ACCOUNT.workers.dev', // ← замените на адрес вашего Worker
  vkServiceToken: '',   // Режим 2: вставьте сюда сервисный токен ВК и оставьте proxyUrl пустым ''
  groupId: 225096327,   // id группы (club225096327)
  postsCount: 9,        // сколько постов показывать
  refreshMinutes: 5     // автообновление ленты, минут
};

const grid = document.getElementById('news-grid');
const statusEl = document.getElementById('news-status');

function formatDate(unix) {
  return new Date(unix * 1000).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function pickPhoto(attachments) {
  if (!attachments) return null;
  const photo = attachments.find(a => a.type === 'photo')?.photo;
  if (!photo || !photo.sizes) return null;
  // берём самое большое изображение
  return photo.sizes.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a)).url;
}

function postText(item) {
  if (item.text && item.text.trim()) return item.text.trim();
  // если это репост — берём текст оригинала
  const orig = item.copy_history && item.copy_history[0];
  if (orig && orig.text && orig.text.trim()) return orig.text.trim();
  return 'Публикация в сообществе АНО «КАМА» — откройте, чтобы посмотреть.';
}

function postPhoto(item) {
  return pickPhoto(item.attachments) ||
    (item.copy_history && item.copy_history[0] && pickPhoto(item.copy_history[0].attachments)) ||
    null;
}

function renderPosts(items) {
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'news-card';

    const photo = postPhoto(item);
    if (photo) {
      const img = document.createElement('img');
      img.className = 'news-photo';
      img.src = photo;
      img.alt = 'Фото из публикации АНО «КАМА»';
      img.loading = 'lazy';
      card.appendChild(img);
    }

    const body = document.createElement('div');
    body.className = 'news-body';

    const date = document.createElement('div');
    date.className = 'news-date';
    date.textContent = formatDate(item.date);

    const text = document.createElement('div');
    text.className = 'news-text';
    text.textContent = postText(item);

    const link = document.createElement('a');
    link.className = 'news-link';
    link.href = 'https://vk.com/wall-' + NEWS_CONFIG.groupId + '_' + item.id;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Читать в ВКонтакте →';

    body.append(date, text, link);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

function showError() {
  grid.innerHTML = '<div class="news-error">Новости временно недоступны. ' +
    '<a href="https://vk.ru/club225096327" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">' +
    'Смотрите их в нашей группе ВКонтакте</a>.</div>';
}

async function loadNews() {
  let data;
  try {
    if (NEWS_CONFIG.proxyUrl) {
      const res = await fetch(NEWS_CONFIG.proxyUrl + '?count=' + NEWS_CONFIG.postsCount);
      data = await res.json();
    } else {
      // Режим 2: прямой запрос к VK API (JSONP, токен в коде страницы)
      data = await new Promise((resolve, reject) => {
        const cb = 'vkCallback' + Date.now();
        const s = document.createElement('script');
        const timer = setTimeout(() => { reject(new Error('timeout')); s.remove(); }, 10000);
        window[cb] = json => { clearTimeout(timer); delete window[cb]; s.remove(); resolve(json); };
        s.onerror = () => { clearTimeout(timer); delete window[cb]; s.remove(); reject(new Error('vk error')); };
        s.src = 'https://api.vk.com/method/wall.get?owner_id=-' + NEWS_CONFIG.groupId +
          '&count=' + NEWS_CONFIG.postsCount + '&filter=owner&v=5.199' +
          '&access_token=' + NEWS_CONFIG.vkServiceToken + '&callback=' + cb;
        document.body.appendChild(s);
      });
    }

    const items = data && data.response && data.response.items;
    if (!items || !items.length) throw new Error('empty');

    renderPosts(items.filter(i => i.post_type === 'post'));
    const updated = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    statusEl.textContent = 'Обновлено в ' + updated;
  } catch (e) {
    showError();
    statusEl.textContent = '';
  }
}

loadNews();
// автообновление ленты при каждом новом посте (периодическая проверка)
setInterval(loadNews, NEWS_CONFIG.refreshMinutes * 60 * 1000);
