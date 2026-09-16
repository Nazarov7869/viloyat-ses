# Jizzax viloyati SES boshqaruv tizimi

Loyiha ikki alohida qismdan iborat:

- **`backend/`** — Python Django + Django REST Framework API (SQLite, JWT autentifikatsiya)
- **`frontend/`** — React + Vite + TypeScript admin panel va ochiq sahifa

`supabase/` papkasi — loyihaning avvalgi (Supabase asosidagi) versiyasidan qolgan tarixiy migratsiyalar, endi ishlatilmaydi.

## Backend'ni ishga tushirish

```sh
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env         # kerak bo'lsa qiymatlarni tahrirlang
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8001
```

Django admin: **http://127.0.0.1:8001/django-admin/** — shu yerda tumanlar, laboratoriyalar, xizmatlar qo'shiladi va foydalanuvchilarga rol (`main`, `qabul`, `payment`, `registrants`, `viloyat`, `laborant`) hamda tuman biriktiriladi.

API bazaviy manzili: `http://127.0.0.1:8001/api/`

## Frontend'ni ishga tushirish

```sh
cd frontend
npm install
npm run dev
```

`frontend/.env` faylida `VITE_API_URL` backend manziliga ishora qilishi kerak (standart: `http://127.0.0.1:8001/api`).

Sayt: **http://localhost:8080/**, admin kirish: **http://localhost:8080/login**

## Ishlash tartibi

1. `/login` sahifasida "Ro'yxatdan o'tish" orqali hisob yarating.
2. Django admin panelida (`/admin/`) shu foydalanuvchiga rol va (kerak bo'lsa) tuman tayinlang.
3. Qayta kiring — tizim rolga mos boshqaruv paneliga yo'naltiradi.

## Laboratoriya xulosa blankalari

Laborant buyurtmani ochganda asl hujjat ko'rinishidagi blankani to'ldiradi,
saqlaydi va chop etadi. Blankalar `hujjattlar/` papkasidagi fayllardan
yasalgan — batafsil: [`tools/blanks/README.md`](tools/blanks/README.md).

Har bir analizga standart blanka Django admin yoki "Sozlamalar" sahifasida
("Xulosa shabloni") biriktiriladi; laborant buyurtma ichida boshqasini tanlashi
mumkin.
