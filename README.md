# replatform_angjs

Намеренно «грязный» legacy-каунтер — подопытный для инструмента переписывания/рефакторинга кода.

## Стек (специально устаревший)
- **frontend/** — AngularJS 1.2 (CDN) + jQuery, логика в контроллере, `.success()`, jQuery-DOM вперемешку с Angular.
- **backend/** — Express 4, `var`, глобальный стейт, синхронный файловый «DB» (`data.json`), ручной CORS, ноль валидации/обработки ошибок.

## Запуск
```bash
# бэкенд (порт 4000)
cd backend && npm install && npm start

# фронтенд — открыть frontend/index.html в браузере
# (или любой статик-сервер, напр. `npx http-server frontend`)
```

## Что тут «грязного» (места для улучшений)
- Бэк: глобальные `count`/`history`, `readFileSync`/`writeFileSync` на каждый запрос, `parseInt` без проверки, магические строки, отсутствие роутеров/слоёв, `res.send(200)`.
- Фронт: бизнес-логика в `$scope`, устаревший `$http().success()`, хардкод `API`, `loadHistory()` через jQuery мимо Angular, инлайновые стили, `confirm()`.

## API
| Метод | Путь | Тело | Ответ |
|-------|------|------|-------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | — | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
