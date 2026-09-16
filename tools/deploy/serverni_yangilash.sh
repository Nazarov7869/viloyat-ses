#!/usr/bin/env bash
# =============================================================================
#  viloyat-ses — serverni xavfsiz yangilash (blankalar + narx tuzatishlari)
#
#  Ishlatish (serverda, loyiha papkasida — docker-compose.yml turgan joyda):
#      bash serverni_yangilash.sh            # tekshiradi, keyin yangilaydi
#      bash serverni_yangilash.sh --tekshir  # faqat tekshiradi, hech narsa o'zgarmaydi
#
#  Nima qiladi:
#    1. Bazaning va serverdagi kodning zaxira nusxasini oladi
#    2. Serverdagi saqlanmagan o'zgarishlarni alohida branchga commit qiladi
#       (hech narsa yo'qolmaydi)
#    3. GitHub'dagi `lab-blankalar` branchini birlashtiradi (konflikt bo'lsa — to'xtaydi
#       va hammasini avvalgi holatga qaytaradi)
#    4. Frontendni yig'adi, konteynerlarni qayta ishga tushiradi, natijani tekshiradi
# =============================================================================
set -euo pipefail

BRANCH="lab-blankalar"
REPO_URL_DEFAULT="https://github.com/Nazarov7869/viloyat-ses.git"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${HOME}/viloyat-ses-zaxira/${STAMP}"
ONLY_CHECK=0
[[ "${1:-}" == "--tekshir" ]] && ONLY_CHECK=1

yashil() { printf '\033[32m%s\033[0m\n' "$*"; }
sariq()  { printf '\033[33m%s\033[0m\n' "$*"; }
qizil()  { printf '\033[31m%s\033[0m\n' "$*"; }
qadam()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
toxta()  { qizil "XATO: $*"; qizil "Hech narsa buzilmadi. Shu chiqishni to'liq nusxalab yuboring."; exit 1; }

# --- 0. Muhitni tekshirish ----------------------------------------------------
qadam "0. Muhitni tekshirish"
[[ -f docker-compose.yml || -f docker-compose.yaml || -f compose.yml ]] \
  || toxta "docker-compose.yml topilmadi. Skriptni loyiha papkasida ishga tushiring (cd <loyiha>)."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || toxta "Bu papka git repozitoriy emas."

if docker compose version >/dev/null 2>&1; then DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then DC="docker-compose"
else toxta "docker compose topilmadi."; fi
command -v npm >/dev/null 2>&1 || toxta "npm (Node.js) o'rnatilmagan — frontendni yig'ish uchun kerak."

echo "Papka:        $(pwd)"
echo "Joriy branch: $(git rev-parse --abbrev-ref HEAD)"
echo "Joriy commit: $(git log -1 --format='%h %s')"
echo "Docker:       ${DC}"
echo "Node/npm:     $(node -v 2>/dev/null || echo '?') / $(npm -v)"

REMOTE="origin"
git remote get-url origin >/dev/null 2>&1 || { git remote add origin "$REPO_URL_DEFAULT"; }
echo "GitHub:       $(git remote get-url origin)"

qadam "Serverdagi o'zgarishlar (git status)"
git status --short || true
CHANGED=$(git status --porcelain | wc -l)
echo "O'zgargan/yangi fayllar soni: ${CHANGED}"

qadam "GitHub'dan yangilanishlarni olish"
git fetch "$REMOTE" "$BRANCH" main 2>&1 | tail -3 || toxta "GitHub'dan olib bo'lmadi (internet yoki ruxsat)."
echo "Olinadigan commitlar:"
git log --oneline "HEAD..${REMOTE}/${BRANCH}" | head -20

# Sinov birlashtirish (hech narsani o'zgartirmaydi)
TMPTREE="$(mktemp -d)"
git worktree add -q --detach "$TMPTREE" HEAD
if [[ "$CHANGED" -gt 0 ]]; then
  # serverdagi o'zgarishlarni vaqtinchalik nusxaga ko'chirib sinaymiz
  git stash push -u -q -m "sinov-${STAMP}" && git -C "$TMPTREE" stash apply -q "stash@{0}" 2>/dev/null || true
  git stash pop -q || true
  git -C "$TMPTREE" add -A && git -C "$TMPTREE" -c user.name=server -c user.email=server@local commit -q -m sinov || true
fi
if git -C "$TMPTREE" -c user.name=server -c user.email=server@local merge -q --no-edit "${REMOTE}/${BRANCH}" >/dev/null 2>&1; then
  yashil "Sinov: birlashtirish KONFLIKTSIZ o'tadi."
  MERGE_OK=1
else
  qizil "Sinov: birlashtirishda KONFLIKT bor. Konfliktli fayllar:"
  git -C "$TMPTREE" diff --name-only --diff-filter=U || true
  MERGE_OK=0
fi
git -C "$TMPTREE" merge --abort >/dev/null 2>&1 || true
git worktree remove --force "$TMPTREE"

if [[ "$ONLY_CHECK" -eq 1 ]]; then
  qadam "Faqat tekshirish rejimi — hech narsa o'zgartirilmadi."
  exit 0
fi
[[ "$MERGE_OK" -eq 1 ]] || toxta "Konflikt bor. Yuqoridagi fayllar ro'yxatini yuboring — birlashtirib beraman."

read -r -p $'\nDavom etilsinmi? (ha/yo\'q): ' JAVOB
[[ "$JAVOB" == "ha" ]] || { sariq "To'xtatildi."; exit 0; }

# --- 1. Zaxira -------------------------------------------------------------------
qadam "1. Zaxira nusxa: ${BACKUP_DIR}"
mkdir -p "$BACKUP_DIR"
git bundle create "${BACKUP_DIR}/kod.bundle" --all >/dev/null 2>&1 || true
tar --exclude=node_modules --exclude=.git -czf "${BACKUP_DIR}/kod-papka.tgz" . 2>/dev/null || true
if $DC ps -q backend >/dev/null 2>&1 && [[ -n "$($DC ps -q backend)" ]]; then
  DBP="$($DC exec -T backend sh -c 'python -c "from django.conf import settings as s; import django,os; os.environ.setdefault(\"DJANGO_SETTINGS_MODULE\",\"config.settings\"); django.setup(); print(s.DATABASES[\"default\"][\"NAME\"])"' 2>/dev/null | tail -1 || true)"
  DBENGINE="$($DC exec -T backend sh -c 'python -c "import django,os; os.environ.setdefault(\"DJANGO_SETTINGS_MODULE\",\"config.settings\"); django.setup(); from django.conf import settings as s; print(s.DATABASES[\"default\"][\"ENGINE\"])"' 2>/dev/null | tail -1 || true)"
  echo "Baza: ${DBENGINE:-?} ${DBP:-?}"
  if [[ "$DBENGINE" == *sqlite3* && -n "$DBP" ]]; then
    $DC exec -T backend sh -c "cp '$DBP' '$DBP.bak-${STAMP}'" && yashil "Baza nusxasi (konteyner ichida): $DBP.bak-${STAMP}"
    $DC cp "backend:$DBP" "${BACKUP_DIR}/db.sqlite3" >/dev/null 2>&1 && yashil "Baza nusxasi (serverda): ${BACKUP_DIR}/db.sqlite3" || true
  else
    $DC exec -T backend python manage.py dumpdata --natural-foreign --indent 0 > "${BACKUP_DIR}/db-dump.json" \
      && yashil "Baza nusxasi: ${BACKUP_DIR}/db-dump.json" || toxta "Baza zaxirasini olib bo'lmadi."
  fi
else
  sariq "backend konteyneri ishlamayapti — baza zaxirasi o'tkazib yuborildi."
fi

# --- 2. Serverdagi o'zgarishlarni saqlash ------------------------------------------
qadam "2. Serverdagi o'zgarishlarni saqlash"
if [[ "$CHANGED" -gt 0 ]]; then
  git add -A
  git -c user.name="server" -c user.email="server@tuman-ses.uz" commit -q -m "Serverdagi o'zgarishlar (${STAMP})"
  git branch "server-ozgarishlar-${STAMP}" HEAD
  yashil "Saqlandi: branch server-ozgarishlar-${STAMP}"
else
  echo "Saqlanmagan o'zgarish yo'q."
fi

# --- 3. Birlashtirish --------------------------------------------------------------
qadam "3. ${BRANCH} ni birlashtirish"
OLD_HEAD="$(git rev-parse HEAD)"
if ! git -c user.name="server" -c user.email="server@tuman-ses.uz" merge --no-edit "${REMOTE}/${BRANCH}"; then
  git merge --abort || true
  toxta "Birlashtirish bajarilmadi (kod avvalgi holatda: ${OLD_HEAD})."
fi
yashil "Kod yangilandi: $(git log -1 --format='%h %s')"

# --- 4. Frontend ---------------------------------------------------------------------
qadam "4. Frontendni yig'ish (VITE_API_URL=/api)"
(
  cd frontend
  npm ci --no-audit --no-fund
  VITE_API_URL=/api npm run build
) || { git reset -q --hard "$OLD_HEAD"; toxta "Frontend yig'ilmadi — kod avvalgi holatga qaytarildi."; }
[[ -f frontend/dist/blanks/manifest.json ]] || sariq "Ogohlantirish: dist/blanks/manifest.json topilmadi."

# --- 5. Konteynerlar -----------------------------------------------------------------
qadam "5. Konteynerlarni qayta yig'ish va ishga tushirish"
$DC build || { git reset -q --hard "$OLD_HEAD"; toxta "docker build xato berdi — kod avvalgi holatga qaytarildi (konteynerlar o'zgarmadi)."; }
$DC up -d

qadam "6. Tekshirish"
sleep 8
$DC ps
echo "--- backend log (oxirgi 25 qator) ---"
$DC logs --tail 25 backend || true
echo "--- migratsiyalar ---"
$DC exec -T backend python manage.py showmigrations admissions catalog 2>/dev/null | tail -12 || true
echo "--- testlar ---"
$DC exec -T backend python manage.py test admissions --noinput 2>&1 | tail -4 || sariq "Testlarni konteynerda ishga tushirib bo'lmadi."
CODE="$(curl -s -o /dev/null -w '%{http_code}' http://localhost/blanks/manifest.json || true)"
[[ "$CODE" == "200" ]] && yashil "Blankalar: /blanks/manifest.json -> 200" || sariq "Blankalar: /blanks/manifest.json -> ${CODE} (nginx sozlamasini tekshiring)"

qadam "TAYYOR"
yashil "Yangilandi. Zaxira: ${BACKUP_DIR}"
echo "Orqaga qaytarish kerak bo'lsa:"
echo "  git reset --hard ${OLD_HEAD} && (cd frontend && VITE_API_URL=/api npm run build) && ${DC} build && ${DC} up -d"
echo "  va bazani zaxiradan tiklang: ${BACKUP_DIR}"
