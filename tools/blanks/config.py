"""
Blanka shablonlari konfiguratsiyasi.

Har bir yozuv `hujjattlar/` papkasidagi bitta asl fayldan (docx/doc/xlsx) bitta
yoki bir nechta veb-blanka yasaydi. Veb-blanka asl hujjatning aynan o'zi
(LibreOffice orqali PDF -> SVG), ustiga to'ldiriladigan maydonlar qo'yiladi —
shuning uchun chop etilgan blanka asl Word/Excel blankasi bilan egizak bo'ladi.

Maydonlar:
  key      — shablon kaliti (Service.conclusion_template da saqlanadi)
  title    — ro'yxatda ko'rinadigan nom
  form     — tibbiy hujjat shakli raqami (bo'lsa)
  labs     — tavsiya qilinadigan laboratoriyalar (lab_groups dagi kalitlar)
  source   — hujjattlar/ ichidagi fayl nomi
  pages    — qaysi sahifalar olinadi (0 dan boshlab). None = hammasi
  mirror   — True bo'lsa, tanlangan sahifalar bir xil nusxalar: bir nusxaga
             yozilgan qiymat boshqalarida ham avtomatik chiqadi
  grid     — (ustunlar, qatorlar): bitta sahifada bir nechta bir xil nusxa bo'lsa
  redact   — asl faylda qolib ketgan namunaviy (to'ldirilgan) ma'lumotlarni
             o'chirish: [{"text": ..., "clip": (x0, y0, x1, y1)?, "field": bool}]
  sheet    — xlsx uchun faqat shu varaq (indeks) olinadi
"""

# Laboratoriyani nom yoki kod bo'yicha tanish uchun kalit so'zlar (kichik harfda).
LAB_GROUPS = {
    "sangig": {"codes": ["SANGIG"], "keywords": ["sanitariya-gigiena", "sanitariya gigiena", "gigiena"]},
    "bak": {"codes": ["BAK"], "keywords": ["bakteriolog"]},
    "uxyk": {"codes": ["UXYK", "OXYUK"], "keywords": ["xavfli", "o'xyuk", "oʻxyuk", "o‘xyuk", "ўхюк"]},
    "virus": {"codes": ["VIRUS"], "keywords": ["virusolog"]},
    "dezinf": {"codes": ["DEZINF"], "keywords": ["dezinf"]},
    "paraz": {"codes": ["PARAZ"], "keywords": ["parazit"]},
    "radiol": {"codes": ["RADIOL"], "keywords": ["radiolog"]},
    "davxizm": {"codes": ["DAVXIZM"], "keywords": ["davlat xizmat", "pullik"]},
    "sanbol": {"codes": ["SANBOL"], "keywords": ["sanitariya bo"]},
}

BLANKS = [
    # ---------------- O'ta xavfli yuqumli kasalliklar (O'XYuK) ----------------
    dict(key="brutselloz_ifa", title="Bruselloz IFA tahlili (IgM/IgG)", form="291",
         labs=["uxyk"], source="BRutseloz IFA balnka.docx", mirror=True),
    dict(key="trichomonas_candida_ifa", title="Trichomonas / Candida IFA tahlili", form="291",
         labs=["uxyk"], source="Candi-Trich.docx", mirror=True),
    dict(key="echinokokk_ifa", title="Exinokokk IFA tahlili (IgM/IgG)", form="291",
         labs=["uxyk"], source="ЭХНОКОКК ИФА.docx", mirror=True),
    dict(key="brutselloz_serological", title="Zoonoz kasalliklarga tekshiruv xulosasi (Bruselloz)", form="291-h/sh",
         labs=["uxyk"], source="Бруцеллёз хулоса (2) — копия.docx", mirror=True),
    dict(key="torch_ifa", title="TORCH infeksiyasi tekshiruvi (IFA)", form="079",
         labs=["uxyk"], source="TORCH  IFA javoblari  (3).doc", mirror=True),
    dict(key="aslo_srb_rf", title="Antistreptolizin-O, S-reaktiv oqsil, revmatoid omil tahlili", form="068",
         labs=["uxyk"], source="REMOPROB.docx", pages=[0],
         redact=[
             {"text": "Raimova Shaxlo", "field": True},
             {"text": "1976", "field": True},
             {"text": "Sharof Rashidov t-ni qo’shko’prik maxallasi", "field": True},
             {"text": "27", "clip": (0, 300, 600, 340), "field": True},
             {"text": "Mart", "clip": (0, 300, 600, 340), "field": True},
             {"text": "27", "clip": (0, 640, 600, 680), "field": True},
             {"text": "mart", "clip": (0, 640, 600, 680), "field": True},
             {"text": "1", "clip": (295, 220, 320, 245), "field": True},
             {"text": "6mg/l", "clip": (340, 495, 470, 525)},
             {"text": "20ME/ml", "clip": (340, 495, 470, 565)},
             {"text": "200Ed/ml", "clip": (340, 560, 470, 605)},
         ]),

    # ---------------- Virusologiya ----------------
    dict(key="gepatit_c_ifa", title="Gepatit C (anti-HCV, IFA) tahlili natijasi", form="365",
         labs=["virus"], source="yuqumli-kassaliklar.docx", pages=[0], grid=(2, 1)),
    dict(key="gepatit_pcr", title="PZR usulida virusli gepatit markerlari", form="",
         labs=["virus"], source="yuqumli-kassaliklar.docx", pages=[1]),
    dict(key="covid_pcr", title="COVID-19 PZR tekshiruvi natijalari", form="",
         labs=["virus"], source="yuqumli-kassaliklar.docx", pages=[2]),

    # ---------------- Parazitologiya ----------------
    dict(key="parazit_biologik_ajralma", title="Biologik ajralma tahlili (najas, surtma)", form="048",
         labs=["paraz"], source="Parazitalogiya-labaratoriyasi.doc"),

    # ---------------- Bakteriologiya ----------------
    dict(key="bak_antibiotik", title="Bakteriologik analiz xulosasi (antibiotiklarga sezgirlik)", form="",
         labs=["bak"], source="Бланк антибиот.docx"),
    dict(key="bak_manfiy", title="Bakteriologik analiz xulosasi (qisqa, 4 nusxa)", form="",
         labs=["bak"], source="Бланка манфий нати 1111.docx", grid=(2, 2)),
    dict(key="bak_ichimlik_suvi", title="Ichimlik suvi — sanitariya-bakteriologik tekshirish bayonnomasi", form="",
         labs=["bak"], source="Ичимлик суви бланкаси  .xlsx", sheet=0,
         redact=[{"text": "200-204", "field": True}, {"text": "O'z MSt  133-2024"}]),
    dict(key="bak_mutloq_tozalik", title="Mutloq tozalikka tekshirish bayonnomasi", form="",
         labs=["bak"], source="Мутлок_тозаликга_текшириш_бланкаси_.xlsx", sheet=0),
    dict(key="bak_oziq_ovqat", title="Oziq-ovqat — sanitariya-bakteriologik tekshirish bayonnomasi", form="",
         labs=["bak"], source="Озик-овкат бланкаси.xlsx", sheet=0),
    dict(key="bak_ochiq_suv", title="Ochiq suv — sanitariya-bakteriologik tekshirish protokoli", form="",
         labs=["bak"], source="Очик Сув бланкаси  .xlsx", sheet=0, clear_xlsx="bak_ochiq_suv"),
    dict(key="bak_surtma", title="Surtma namunalari — sanitariya-bakteriologik tekshirish", form="",
         labs=["bak"], source="Суртмаларни текшириш бланкаси .xlsx", sheet=0),
    dict(key="bak_tuproq", title="Tuproq namunalari — sanitariya-bakteriologik tekshirish", form="",
         labs=["bak"], source="Тупрокни текшириш  бланкаси.xlsx", sheet=0),
    dict(key="bak_havo", title="Havo namunalari — sanitariya-bakteriologik tekshirish", form="",
         labs=["bak"], source="Хаво_намуналарини_текшириш_бланкаси_.xlsx", sheet=0,
         redact=[{"text": "5-10", "field": True}]),

    # ---------------- Sanitariya-gigiena ----------------
    dict(key="f328_ochiq_suv", title="Ochiq suv havzalari va oqava suvlarni tekshirish bayonnomasi", form="328",
         labs=["sangig"], source="328_Ochiq_suv_havzalari_va_oqava_suvlarni_tekshirish_boʻyicha_bayonnoma.docx"),
    dict(key="f330_ichimlik_suvi", title="Ichimlik suvini tekshirish bayonnomasi", form="330",
         labs=["sangig"], source="330 Ichimlik suvini tekshirish boʻyicha bayonnoma.docx"),
    dict(key="f333_aholi_havosi", title="Aholi yashash joylari havosini tekshirish bayonnomasi", form="333",
         labs=["sangig"], source="333_Aholi_yashash_joylari_havosini_tekshirish_boʻyicha_bayonnoma.docx"),
    dict(key="f334_yopiq_xona_havosi", title="Yopiq xonalar havosini tekshirish bayonnomasi", form="334",
         labs=["sangig"], source="334 Yopiq xonalar havosini tekshirish boʻyicha bayonnoma.docx"),
    dict(key="f335_ob_havo", title="Ob-havo omillarini o'lchash bayonnomasi", form="335",
         labs=["sangig"], source="335 Ob-havo omillarini oʻlchash boʻyicha bayonnoma.docx"),
    dict(key="f338_tuproq", title="Tuproq namunalarini tekshirish bayonnomasi", form="338",
         labs=["sangig"], source="338 Tuproq namunalarini tekshirish boʻyicha bayonnoma.docx"),
    dict(key="f340_elektromagnit", title="Elektromagnit maydoni kuchlanishini o'lchash bayonnomasi", form="340",
         labs=["sangig", "radiol"], source="340 Elektromagnit maydoni kuchlanishini oʻlchashdagi.docx"),
    dict(key="f341_shovqin", title="Shovqin va tebranishni o'lchash bayonnomasi", form="341",
         labs=["sangig"], source="341 Shovqin va tebranishni (vibrasiya) oʻlchash boʻyicha.docx"),
    dict(key="f342_yoruglik", title="Yorug'likni o'lchash bayonnomasi", form="342",
         labs=["sangig"], source="342 Yorugʻlikni oʻlchash boʻyicha bayonnoma.docx"),
    dict(key="f347_oziq_ovqat", title="Oziq-ovqat mahsulotlari namunalarini tekshirish bayonnomasi", form="347",
         labs=["sangig"], source="347_Oziq_ovqat_mahsulotlaridan_olingan_namunalarni_tekshirish_boʻyicha.docx"),
    dict(key="f347_oziq_ovqat_v2", title="Oziq-ovqat namunalarini tekshirish bayonnomasi (2-variant)", form="347",
         labs=["sangig"], source="oziq ovqat.docx"),
    dict(key="f363_polimer", title="Polimer va boshqa materiallarni tekshirish bayonnomasi", form="363",
         labs=["sangig"], source="363_Polimer_va_boshqa_ashyolardan_tayyorlangan_materiallarni_tekshirish.docx"),

    # ---------------- Radiologiya ----------------
    dict(key="f279_inm_pasport", title="Ionlashtiruvchi nurlar manbalari bilan ishlash — sanitariya xulosasi", form="279",
         labs=["radiol"], source="279_Ionlashtiruvchi_nurlar_manbaalari_bilan_ishlash_huquqini_beruvchi.docx"),
    dict(key="f356_dozimetrik", title="Dozimetrik o'lchov bayonnomasi", form="356",
         labs=["radiol"], source="356 Dozimetrik oʻlchov boʻyicha bayonnoma.docx"),
    dict(key="f357_rentgen", title="Rentgen kabinetini foydalanishga qabul qilish dalolatnomasi", form="357",
         labs=["radiol"], source="357_Rentgen_kabinetni_foydalanishga_qabul_etilganligi_haqida_dalolatnoma.docx"),
    dict(key="radiol_namuna_akt", title="Mahsulotlardan namunalar olish dalolatnomasi (AKT)", form="",
         labs=["radiol"], source="акт атбор-радиология.docx"),

    # ---------------- Dezinfeksiya ----------------
    dict(key="f394_dezinfeksiya", title="Dezinfeksiya vositalarini tekshirish bayonnomasi", form="394",
         labs=["dezinf"], source="394 Dezinfeksiya vositalarini tekshirish bayonnoma.docx"),

    # ---------------- Sanitariya bo'limi / Davlat xizmatlari ----------------
    dict(key="f319_dalolatnoma", title="Sanitariya-epidemiologik tekshiruv o'tkazilganligi dalolatnomasi", form="319",
         labs=["sanbol", "davxizm"], source="319_Sanitariya_epidemiologik_tekshiruv_o'tkazilganligi_haqida_dalolatnoma.docx"),
]
