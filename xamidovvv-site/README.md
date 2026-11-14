# XAMIDOVVV

Сайт студии: Next.js 14 (App Router) + Supabase (отзывы, контакты, админка). Языки EN / RU / UZ.

## Запуск локально
```bash
npm install
cp .env.example .env.local   # впиши ключи Supabase (можно оставить пустыми: сайт работает, отзывы и админка выключены)
npm run dev                  # http://localhost:3000
```

## Ключи Supabase: что куда
В Supabase: Project Settings -> API Keys.

| Ключ | Где использовать | Переменная |
|---|---|---|
| Publishable `sb_publishable_...` | браузер и сервер, безопасен | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret `sb_secret_...` | **только сервер** | `SUPABASE_SECRET_KEY` (без `NEXT_PUBLIC_`!) |

Secret-ключ нельзя класть в `NEXT_PUBLIC_*`: такие переменные попадают в браузер. Если ты уже клал secret-ключ в
`NEXT_PUBLIC_SUPABASE_ANON_KEY` и деплоил, **перевыпусти его** (API Keys -> Secret keys -> удалить и создать новый),
потому что он мог попасть в публичный код. Приложение само откажется работать, если найдёт secret-ключ в публичной переменной.

## Настройка Supabase (нужна для отзывов, контактов и админки)
1. Создай проект на supabase.com.
2. SQL Editor: вставь и выполни `supabase/schema.sql` (можно запускать повторно, старые небезопасные политики удалятся).
3. Authentication -> Sign In / Providers -> Email: **выключи Allow new users to sign up**.
4. Authentication -> Users -> Add user: создай себя (email + пароль).
5. SQL Editor: `insert into public.admins (email) values ('твой-email@example.com');` (строчными буквами, как в Auth).
   Только email из таблицы `admins` попадёт в `/admin`. Просто зарегистрированный пользователь доступа не получит.
6. Впиши три переменные в `.env.local` (локально) и в Vercel (Settings -> Environment Variables):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`.

## Деплой на Vercel
1. Залей проект в GitHub, на vercel.com: Add New -> Project -> выбери репозиторий.
2. Добавь три переменные из шага 6 выше. `SUPABASE_SECRET_KEY` отметь как Sensitive.
3. Deploy.

## Как это работает
- `/` отдаёт страницу (`components/markup.ts` + `public/site.js`); контакты и одобренные отзывы подтягиваются из Supabase раз в минуту.
- `/admin` вход по email и паролю. Браузер не знает ключей Supabase: он общается только с нашими серверными маршрутами `/api/admin/*`. Сессия лежит в httpOnly-cookie, каждый запрос проверяется на сервере (токен валиден и email есть в `admins`), изменяющие запросы проверяются на совпадение Origin. Там можно одобрить, отклонить или удалить отзывы (новые заявки в статусе pending) и изменить ссылки (Telegram, канал, Instagram, TikTok, телефон).
- RLS включён на всех таблицах: посетитель (publishable-ключ) может только читать одобренные отзывы и контакты и добавить отзыв в статусе pending. Админские операции идут на сервере через secret-ключ.
- Отзыв с сайта попадает в статус `pending` и появляется на сайте только после одобрения.
- Защита формы: проверка полей на сервере, ссылка только http(s), скрытое поле-ловушка, лимит частоты, RLS в базе.

## Что где менять
- Тексты и переводы, стили, услуги, шаги: `public/site.js` (словари `T`, `STYLES`, `SERVICES`, `STEPS`).
- Вёрстка секций: `components/markup.ts`. Стили: `app/globals.css`.
- Иллюстрации: `public/img/*.jpg` (замени на свои, размер 760x475).
- Логотип: путь в SVG внутри `components/markup.ts` (вектор, трассированный с оригинала). Лучше заменить на оригинальный SVG.
- Заголовок и описание сайта: `app/layout.tsx`.
