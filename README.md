# replatform_angjs

Намеренно «грязный» legacy-каунтер — подопытный для инструмента переписывания/рефакторинга кода.

## Стек
- **frontend/** — React + Vite. Единый стор (`useCounter`) владеет count/step/history, HTTP через `fetch`-клиент (`src/api.js`), API base URL настраивается через `VITE_API_URL`.
- **backend/** — Express 4, `var`, глобальный стейт, синхронный файловый «DB» (`data.json`), ручной CORS, ноль валидации/обработки ошибок. (Не трогаем — вне скоупа рефакторинга.)

## Запуск
```bash
# бэкенд (порт 4000)
cd backend && npm install && npm start

# фронтенд — dev-сервер Vite
cd frontend
cp .env.example .env   # задаёт VITE_API_URL=http://localhost:4000
npm install
npm run dev             # dev-сервер с HMR, см. выведенный URL

# либо продакшн-сборка
npm run build            # -> frontend/dist
npm run preview          # раздаёт собранный dist/ локально
```

`VITE_API_URL` — базовый URL backend API, читается Vite из `frontend/.env` (см. `frontend/.env.example`). Без файла `.env` (скопированного из `.env.example`) фронтенд не будет знать, куда стучаться.

## Известные ограничения (сознательно не трогали backend)
- Бэк: глобальные `count`/`history`, `readFileSync`/`writeFileSync` на каждый запрос, магические строки, отсутствие роутеров/слоёв, `res.send(200)`.
- `/dec` игнорирует тело запроса и всегда вычитает `1`, даже если фронтенд теперь честно шлёт `{by: step}` для паритета с `/inc` (см. комментарий в `frontend/src/state/useCounter.js` и заметку в UI). Требует отдельного backend-фикса, вне скоупа этого рефакторинга.
- `/inc` делает `parseInt(by)` без проверки на `NaN`; фронтенд теперь ограничивает ввод шага только цифрами, что закрывает риск с клиентской стороны, но не в самом backend.

## API
| Метод | Путь | Тело | Ответ |
|-------|------|------|-------|
| GET | `/count` | — | `{count}` |
| POST | `/inc` | `{by?}` | `{count}` |
| POST | `/dec` | — | `{count}` |
| POST | `/reset` | — | `{count}` |
| GET | `/history` | — | `[{t,op,val}]` |
