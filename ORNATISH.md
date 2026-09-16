# O'rnatish yo'riqnomasi — laboratoriya xulosa blankalari

O'zgarishlar bitta commit'da: `Laboratoriya xulosa blankalari: ...`
Ikki xil yo'l bilan qo'llash mumkin — patch (tavsiya) yoki to'liq arxiv.

## 1. O'zgarishlarni repozitoriyga qo'shish

### A) Patch orqali (tavsiya etiladi)

Kompyuteringizda, loyiha papkasida:

```sh
git checkout main          # yoki ishlayotgan branch
git pull
git am < viloyat-ses-blankalar.patch
git push
```

`git am` xato bersa: `git am --abort`, so'ng `git apply --3way viloyat-ses-blankalar.patch`.

### B) Arxiv orqali

`viloyat-ses-yangilangan.zip` ichida butun loyiha bor (`node_modules`, `dist`,
`.env` fayllarsiz). Fayllarni loyiha papkangizga ustidan ko'chiring va commit qiling.
Diqqat: arxivda **o'chirilgan** 5 ta eski fayl yo'q, ularni qo'lda o'chiring:

```
frontend/src/components/lab/BrutsellozIfaBlank.tsx
frontend/src/components/lab/BrutsellozSerologicalBlank.tsx
frontend/src/components/lab/EchinokokkBlank.tsx
frontend/src/components/lab/IfaResultBlank.tsx
frontend/src/components/lab/TrichomonasCandidaBlank.tsx
```

## 2. Serverga o'rnatish

```sh
ssh <foydalanuvchi>@<server>
cd <loyiha papkasi>          # docker-compose.yml turgan joy

# 0) Bazaning zaxira nusxasi (majburiy!)
docker compose exec backend sh -c 'cp "$DB_PATH" "$DB_PATH.bak-$(date +%F)"' \
  || docker compose exec backend sh -c 'ls /data'

# 1) Yangi kodni olish
git pull

# 2) Frontendni yig'ish (frontend/Dockerfile tayyor dist/ ni ko'chiradi)
cd frontend
npm ci
VITE_API_URL=/api npm run build
cd ..

# 3) Konteynerlarni qayta yig'ib ishga tushirish
docker compose build
docker compose up -d
```

Backend konteyneri ishga tushganda migratsiyalarni o'zi bajaradi
(`entrypoint.sh` → `migrate`). Tekshirish:

```sh
docker compose logs backend --tail 30        # "Applying admissions.0002..." bo'lishi kerak
docker compose exec backend python manage.py showmigrations admissions catalog
curl -I http://localhost/blanks/manifest.json   # 200 OK bo'lishi kerak
```

### VITE_API_URL haqida

Repozitoriydagi `frontend/.env` faylida `VITE_API_URL="http://127.0.0.1:8000/api"`
yozilgan. Frontend shu qiymat bilan yig'ilsa, brauzer API'ni foydalanuvchining
**o'z kompyuteridan** qidiradi va sayt ishlamaydi. Serverda nginx `/api/` ni
backendga uzatadi, shuning uchun build vaqtida `VITE_API_URL=/api` berish kerak
(yuqoridagi buyruqda bor). Doimiy yechim: `frontend/.env.production` fayli:

```
VITE_API_URL=/api
```

## 3. Sozlash

1. Admin bilan kiring → **Sozlamalar** → "Analizlar va narxlar".
   Har bir analiz uchun **"Xulosa shabloni"** ni tanlang
   (masalan: "Bruselloz IFA" → `291 — Bruselloz IFA tahlili`).
   Buni Django admin (`/django-admin/` → Services) orqali ham qilish mumkin.
2. Laboratoriya nomlari blankalarni tavsiya qilishda ishlatiladi
   (masalan, nomida "Bakteriologiya", "Virusologiya", "Parazitologiya",
   "Radiologiya", "Dezinfeksiya", "Sanitariya-gigiena", "O'ta xavfli" so'zlari).
   Kodlar `SANGIG, BAK, UXYK, VIRUS, DEZINF, PARAZ, RADIOL, DAVXIZM, SANBOL`
   bo'lsa ham taniladi. Laborant baribir barcha blankalarni ro'yxatdan tanlay oladi.

## 4. Tekshirish (laborant sifatida)

1. Masalan `uxyk@ses.local` bilan kiring → navbatdagi buyurtmada **Ochish**.
2. "Xulosa blankasi" da asl hujjat ko'rinishidagi blanka chiqadi,
   F.I.Sh / yoshi / manzili o'zi to'lgan bo'ladi.
3. Sariq joylarga natijalarni yozing → **Saqlash**.
4. Oynani yopib qayta oching — yozilganlar joyida turishi kerak.
5. **Chop etish** — varaq asl Word blankasi bilan bir xil chiqadi.

## 5. Nima o'zgardi (qisqacha)

- Xulosa blankasi endi bazaga saqlanadi (`LabOrder.conclusion_*` maydonlari).
- `hujjattlar/` dagi fayllardan 37 ta "egizak" blanka (`frontend/public/blanks/`).
- Bir necha nusxali blankalarda bir joyga yozilgan qiymat hamma nusxada chiqadi.
- Laborant buyurtmani boshqa laboratoriya/tumanga ko'chira olmaydi.
- Laboratoriya kodi katta-kichik harfga qaramay topiladi.
- Konteyner qayta ishga tushganda seed admin o'zgarishlarini o'chirmaydi.
- Yangi blanka qo'shish: `tools/blanks/README.md`.

## Orqaga qaytarish

```sh
git revert <commit>
cd frontend && VITE_API_URL=/api npm run build && cd ..
docker compose build && docker compose up -d
# kerak bo'lsa bazani zaxiradan tiklang (0-qadam)
```
Migratsiyalar faqat yangi maydon qo'shadi; eski kod bu maydonlarga tegmaydi.
