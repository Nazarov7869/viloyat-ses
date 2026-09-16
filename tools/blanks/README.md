# Laboratoriya blankalari (egizak blankalar)

Saytdagi xulosa blankalari `hujjattlar/` papkasidagi asl Word/Excel fayllardan
avtomatik yasaladi. Har bir blanka — asl hujjat sahifasining aynan o'zi (SVG)
va uning ustiga qo'yilgan to'ldiriladigan maydonlar. Shuning uchun chop etilgan
blanka asl hujjat bilan bir xil chiqadi.

Natija fayllari:

| Fayl | Vazifasi |
|---|---|
| `frontend/public/blanks/manifest.json` | shablonlar, sahifalar, maydonlar ro'yxati |
| `frontend/public/blanks/<kalit>/pN.svg` | sahifaning asl ko'rinishi |
| `backend/catalog/blank_templates.json` | Django admin va API tekshiruvi uchun kalit/nomlar |

Bu fayllar repozitoriyga kiritilgan, serverda qayta yasash **shart emas**.

## Yangi blanka qo'shish yoki blankani yangilash

1. Faylni `hujjattlar/` papkasiga qo'ying.
2. `tools/blanks/config.py` ichidagi `BLANKS` ro'yxatiga yozuv qo'shing:
   ```python
   dict(key="yangi_blanka", title="Blanka nomi", form="123",
        labs=["bak"], source="Fayl nomi.docx"),
   ```
   - `labs` — qaysi laboratoriyalarda birinchi ko'rinadi (`LAB_GROUPS` kalitlari).
   - `mirror=True` — fayldagi sahifalar bir xil nusxalar bo'lsa.
   - `grid=(2, 2)` — bir sahifada bir nechta nusxa bo'lsa (ustun, qator).
   - `pages=[0]` — faqat kerakli sahifalar.
   - `redact=[...]` — faylda qolib ketgan namunaviy ma'lumotlarni o'chirish.
3. Skriptni ishga tushiring (LibreOffice va poppler-utils o'rnatilgan kompyuterda):
   ```sh
   pip install -r tools/blanks/requirements.txt
   python tools/blanks/build_blanks.py
   ```
4. O'zgargan fayllarni commit qiling va frontendni qayta build qiling.

Kalitni (`key`) o'zgartirmang: u analizlar sozlamasida va saqlangan xulosalarda
ishlatiladi.
