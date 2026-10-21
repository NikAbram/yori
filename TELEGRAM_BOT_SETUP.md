# Настройка Telegram-бота YŌRI

Инструкция относится к закрытому `ORDER_MODE=private_test`. Реальные секреты сохраняются только в локальном `.env` и в переменных окружения хостинга. Их нельзя отправлять в чат, добавлять в Git, вставлять в скриншоты или выводить в логи.

## 1. Создание бота

1. Откройте официальный аккаунт [@BotFather](https://t.me/BotFather) и выполните `/newbot`.
2. Задайте отображаемое имя `YŌRI`.
3. Выберите уникальный username длиной 5–32 символа из латинских букв, цифр и `_`, заканчивающийся на `bot`.
4. Сохраните выданный токен в менеджере секретов. Если токен был раскрыт, немедленно отзовите его через BotFather и выпустите новый.
5. Через Bot Settings заполните нейтральные описание и краткое описание без вымышленных адресов, контактов, ETA и обещаний действующей доставки.

Не включайте бота в группы: сценарии YŌRI рассчитаны на личный чат. Privacy Mode можно оставить включённым.

## 2. Локальные переменные

Скопируйте `.env.example` в `.env` и заполните:

```dotenv
NEXT_PUBLIC_APP_URL=https://your-real-preview-domain.example
TELEGRAM_BOT_TOKEN=<секрет из BotFather>
TELEGRAM_BOT_USERNAME=<username без @>
TELEGRAM_WEBHOOK_SECRET=<случайная строка>
TELEGRAM_MANAGER_CHAT_ID=<строковый chat ID>
```

`NEXT_PUBLIC_APP_URL` должен быть HTTPS-origin без пути, query и fragment. Значение-заглушка `https://your-app.vercel.app` намеренно отклоняется серверной конфигурацией.

Webhook secret должен содержать 32–256 символов `A–Z`, `a–z`, `0–9`, `_` или `-`. Пример безопасной генерации в PowerShell:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
```

Не преобразуйте `TELEGRAM_MANAGER_CHAT_ID` в JavaScript `number`: идентификатор хранится строкой. Значение потребуется при реализации уведомлений в части 4.4; до этого его можно хранить только в защищённом окружении.

## 3. Mini App и Menu Button

После появления реального HTTPS preview/production URL откройте Bot Settings → Menu Button в BotFather либо выполните `/setmenubutton`:

- выберите созданного бота;
- текст кнопки: `Открыть меню`;
- URL: значение `NEXT_PUBLIC_APP_URL` с завершающим `/`.

Код YŌRI формирует тот же payload `web_app` программно, но часть 4.1 не отправляет его в Telegram. Основная Mini App и её медиа-превью также настраиваются только для реального HTTPS URL.

### Команды

Через Bot Settings → Commands или `/setcommands` сохраните следующий список только после развёртывания обработчика webhook:

```text
start - Открыть YŌRI
help - Как оформить заказ
orders - Мои заказы
```

Код части 4.2 уже обрабатывает эти команды и формирует `web_app`-кнопки. `/orders` открывает HTTPS-маршрут `/orders` напрямую: Main Mini App и `startapp` не требуются для этого сценария.

## 4. Webhook

Ожидаемый адрес: `<NEXT_PUBLIC_APP_URL>/api/telegram/webhook`.

Route Handler принимает только `POST` с `Content-Type: application/json`, проверяет заголовок `X-Telegram-Bot-Api-Secret-Token` до чтения тела и ограничивает payload 128 КиБ. Каждый `update_id` атомарно регистрируется в PostgreSQL: повторная доставка подтверждается без повторного запуска команды. Если обработка завершилась ошибкой, запись снимается, а Telegram получает retryable `503`.

Реальная регистрация webhook и smoke-тест выполняются на этапе размещения. Production long polling и `getUpdates` не используются.

## 5. Что проверить перед регистрацией

- URL открывается по HTTPS на разрешённом хостинге;
- `ORDER_MODE=private_test` и allowlist заданы на сервере;
- токен и webhook secret отсутствуют в Git и клиентском bundle;
- username указан без `@` и заканчивается на `bot`;
- Menu Button открывает тот же origin, что и `NEXT_PUBLIC_APP_URL`;
- webhook регистрируется с тем же secret token, который настроен на сервере.

Регистрация Menu Button через API будет добавлена последующей частью этапа 4. Команды не отправляют запросы в Telegram до получения реального webhook update.

## Официальные источники

- [Telegram: создание и настройка бота](https://core.telegram.org/bots/features#botfather)
- [Telegram Mini Apps и Menu Button](https://core.telegram.org/bots/webapps#launching-mini-apps-from-the-menu-button)
- [Telegram Bot API: webhook и secret token](https://core.telegram.org/bots/api#setwebhook)
- [grammY: long polling и webhooks](https://grammy.dev/guide/deployment-types)
- [grammY: deployment checklist](https://grammy.dev/advanced/deployment)
