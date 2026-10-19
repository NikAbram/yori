# YŌRI

Клиентская основа Telegram Mini App доставки суши и роллов. Текущий статус: завершена часть 2.3 — каталог, локальная корзина, checkout и личные разделы дополнены Telegram-темами, safe-area/viewport, системной кнопкой «Назад» и haptic feedback с полноценным browser fallback.

## Команды

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Серверные заказы, Telegram-аутентификация, Neon, Prisma и CRM ещё не подключены. UI-интеграция Telegram не является авторизацией и не использует `initDataUnsafe`: приём заказов закрыт, личные данные не показываются, а checkout проверяет ввод только локально и ничего не отправляет.
