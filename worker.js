/**
 * Cloudflare Worker: прокси к VK API для сайта АНО «КАМА»
 *
 * Как развернуть:
 *  1. Создайте бесплатный аккаунт на cloudflare.com
 *  2. Workers & Pages → Create Worker → Deploy → Edit code
 *  3. Вставьте этот код, нажмите Deploy
 *  4. Workers & Pages → ваш воркер → Settings → Variables and Secrets
 *     → Add variable → имя: VK_SERVICE_TOKEN, тип: Secret,
 *     значение: ваш сервисный токен ВК
 *  5. Скопируйте публичный URL воркера в js/news.js (NEWS_CONFIG.proxyUrl)
 */

const VK_GROUP_ID = 225096327; // id группы (club225096327), без минуса
const API_VERSION = '5.199';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const count = Math.min(Math.max(parseInt(url.searchParams.get('count') || '10', 10) || 10, 1), 20);

    // простое кэширование на 5 минут (бесплатный edge-кэш Cloudflare)
    const cache = caches.default;
    const cacheKey = new Request(url.origin + url.pathname + '?count=' + count, request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const vkUrl = 'https://api.vk.com/method/wall.get'
      + '?owner_id=-' + VK_GROUP_ID
      + '&count=' + count
      + '&filter=owner'
      + '&v=' + API_VERSION
      + '&access_token=' + env.VK_SERVICE_TOKEN;

    const vkResp = await fetch(vkUrl);
    const data = await vkResp.json();

    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'
      }
    });
    await cache.put(cacheKey, response.clone());
    return response;
  }
};
