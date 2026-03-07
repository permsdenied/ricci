# Ricci Internal Bot

Monorepo корпоративной платформы для внутренних коммуникаций:

- `server` - API на Express + Prisma + PostgreSQL
- `client` - админ-панель на React + Vite

Проект управляет сотрудниками, тегами интересов, корпоративными чатами, пакетами чатов, рассылками и интеграциями с внешними системами.

## Возможности

- Аутентификация админов по JWT и ролям (`SUPER_ADMIN`, `ADMIN`, `VIEWER`)
- CRUD для сотрудников, тегов, чатов и пакетов чатов
- Рассылки по чатам, тегам и всем пользователям
- Отложенные рассылки (встроенный scheduler, проверка каждую минуту)
- Telegram webhook с проверкой секрета
- Внешние интеграции по `x-api-key`
- Безопасная загрузка файлов (проверка magic bytes, SHA-256 имя файла)

## Технологии

- Backend: TypeScript, Express, Prisma, PostgreSQL, Zod, JWT
- Frontend: React 19, TypeScript, Vite, React Router, Axios
- Инфраструктура: dotenv, tsx, Prisma Migrate

## Структура репозитория

```text
.
|- client/          # Админ-панель
|- server/          # API, Prisma, бизнес-логика
|- .env.example     # Пример переменных окружения
|- .gitignore
```

## Требования

- Node.js 20+
- npm 10+
- PostgreSQL 14+

## Быстрый старт

1. Установите зависимости.

```bash
cd server && npm install
cd ../client && npm install
```

2. Настройте переменные окружения.

Используйте шаблон из `.env.example` и создайте:

- `server/.env`
- `client/.env.development`

Минимально необходимые значения:

- `server/.env`: `DATABASE_URL`, `JWT_SECRET`, `BOT_TOKEN`, `BOT_WEBHOOK_SECRET`
- `client/.env.development`: `VITE_API_URL=http://localhost:3000/api`

3. Подготовьте БД и seed.

```bash
cd server
npm run db:migrate
npm run db:seed
```

4. Запустите backend.

```bash
cd server
npm run dev
```

5. Запустите frontend в отдельном терминале.

```bash
cd client
npm run dev
```

6. Откройте:

- API health: `http://localhost:3000/api/health`
- UI: `http://localhost:5173`

## Тестовый админ после seed

После `npm run db:seed` создается супер-админ:

- Email: `admin@ricci.ru`
- Password: `admin123`

Рекомендуется сменить пароль сразу после первого входа.

## Переменные окружения

Полный пример смотрите в `.env.example`.

Backend (`server/.env`):

- `NODE_ENV` - `development`/`production`
- `PORT` - порт API (по умолчанию `3000`)
- `DATABASE_URL` - строка подключения Prisma/PostgreSQL
- `JWT_SECRET` - секрет подписи JWT
- `JWT_EXPIRES_IN` - срок жизни токена
- `BOT_TOKEN` - токен Telegram-бота
- `BOT_WEBHOOK_SECRET` - секрет webhook заголовка
- `INTEGRATION_API_KEY` - ключ внешних интеграций

Frontend (`client/.env.development`):

- `VITE_API_URL` - базовый URL API, например `http://localhost:3000/api`

## Скрипты

Backend (`server/package.json`):

- `npm run dev` - запуск API в watch-режиме
- `npm run build` - сборка TypeScript в `dist`
- `npm run start` - запуск собранного сервера
- `npm run db:migrate` - Prisma migrate dev
- `npm run db:generate` - генерация Prisma Client
- `npm run db:push` - синхронизация схемы без миграций
- `npm run db:seed` - сидирование тестовыми данными
- `npm run db:studio` - Prisma Studio

Frontend (`client/package.json`):

- `npm run dev` - запуск Vite dev server
- `npm run build` - production-сборка
- `npm run preview` - локальный preview сборки
- `npm run lint` - проверка ESLint

## Обзор API

Базовый префикс: `/api`

Public:

- `GET /health`
- `POST /auth/login`

Admin JWT (`Authorization: Bearer <token>`):

- `/auth`: `POST /register` (только `SUPER_ADMIN`), `GET /profile`, `POST /change-password`
- `/users`: CRUD, статистика, управление тегами и чатами, блокировка
- `/tags`: CRUD, список пользователей тега
- `/chats`: список, статистика, участники, обновление
- `/chat-packages`: CRUD, дефолтный пакет, привязка чатов
- `/dashboard`: overview
- `/broadcasts`: CRUD, запуск отправки `POST /broadcasts/:id/send`
- `/uploads`: `POST /uploads` (multipart поле `file`)

Integrations (`x-api-key`):

- `POST /integrations/send-notification`
- `POST /integrations/sync-user`

Telegram webhook:

- `POST /bot/events`
- Заголовок: `x-telegram-bot-api-secret-token`

## Формат ответов и ошибки

Успешный ответ:

```json
{
  "success": true,
  "data": {}
}
```

Ошибка:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Описание"
  }
}
```

Для ошибок валидации Zod возвращается `details` с полями и сообщениями.

## Production заметки

- Установите `NODE_ENV=production`
- Используйте сильный `JWT_SECRET`
- Обязательно задайте `BOT_WEBHOOK_SECRET` и `INTEGRATION_API_KEY`
- Настройте reverse proxy и HTTPS
- Убедитесь, что директория `uploads` доступна на запись

## Полезные пути

- Backend entrypoint: `server/src/index.ts`
- Backend app и роутинг: `server/src/app.ts`
- Prisma schema: `server/prisma/schema.prisma`
- Frontend routes: `client/src/App.tsx`
- API client: `client/src/api/axios.ts`
