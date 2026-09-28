# ZikriLLah 0.12 — инструкция администратору сервера

Документ предназначен для самостоятельного развёртывания на Ubuntu 24.04 LTS рядом с уже работающими сайтами и Telegram-ботами. Команды ниже выполняются **на Linux-сервере в Bash**, а не на компьютере Windows. Проверять результат нужно после каждого раздела; при ошибке не продолжать вслепую.

Репозиторий: https://github.com/itjmu/ZikriLLah. Ветка: `main`. Доступ для клонирования публичного репозитория не требует GitHub-токена. Секреты и пользовательские данные в GitHub отсутствуют намеренно.

## 1. Что требуется получить в результате

- Одна служба `zikrillah.service`: Telegram-бот + HTTP API + раздача веб-приложения.
- Внутренний адрес `http://127.0.0.1:3107`, недоступный напрямую из Интернета.
- Внешний HTTPS-адрес корня сайта, общий для веба и Android. Например, `https://zikr.example.org`, **без `/app` или другого подпути**.
- Постоянная SQLite-база и медиа в `/var/lib/zikrillah`, отдельно от Git-кода.
- Автозапуск, журнал, резервные копии и возможность отката.
- Существующие сайты, боты, базы и службы сервера продолжают работать.

Android APK работает на телефонах, а не на сервере. Java, Android Studio и Android SDK для серверного запуска не нужны. Веб — готовые HTML/CSS/JS, сборка фронтенда не требуется. PostgreSQL, Redis, Docker, PM2 и внешние npm-пакеты для текущей версии не нужны. Используется встроенный `node:sqlite`; нужен Node.js **22.18 или новее в ветке 22**. Примеры устанавливают отдельную актуальную сборку Node 22, не заменяя системную.

```text
Telegram ↔ бот ───────────────┐
                             ├─ SQLite + медиа (/var/lib/zikrillah)
APK ↔ HTTPS ↔ API ────────────┤
браузер/Mini App ↔ HTTPS ↔ API┘
```

## 2. Что администратор получает отдельно от GitHub

Перед началом в закрытом канале должны быть переданы:

| Материал | Для чего | Если отсутствует |
|---|---|---|
| `zikrillah.env` | Действующий `BOT_TOKEN` и числовые `ADMIN_IDS` | Бот без токена не запускается; токен нельзя восстановить из исходников |
| Финальная копия прежней папки `data/` | История, привязки устройств, настройки бота, объявления, очередь рассылок и медиа | Не объявлять перенос завершённым и не подменять историю пустой базой |
| Подтверждение остановки старого экземпляра **этого** бота | Исключить два `getUpdates` с одним токеном и потерю последних записей при переносе | Новый боевой экземпляр пока не запускать |

Если это первая установка без прежних пользователей и данных, папку `data/` переносить не нужно: приложение создаст новую базу. Но отсутствие файла в GitHub само по себе **не означает**, что истории нет.

Владелец проекта подготовил локальный файл `.tools/server-handoff/zikrillah.env`; он не публикуется. Получив его, администратор самостоятельно меняет только адрес и параметры размещения по инструкции ниже. Личный пароль Telegram, пароль GitHub и токены других ботов не нужны. BotFather для основной кнопки веб-приложения не требуется: её формирует сам бот. Настройка отдельной кнопки меню BotFather — необязательна.

**Этот документ не может заменить секретный токен или отсутствующий архив истории.** После получения комплекта остальные решения о пути, порте, HTTPS и службах администратор принимает по указанным правилам без дополнительных вопросов владельцу.

## 3. Правила работы на сервере с другими проектами

Нужны root-права либо рабочий `sudo`. Пользователь без sudo не сможет установить системную службу и настроить Nginx. Не выдавайте ему широкие права только ради этой инструкции: установку выполняет администратор.

Запрещено использовать `killall node`, `pkill node`, `pm2 stop all`, удалять чужие конфигурации Nginx, сбрасывать firewall, заменять общесистемный Node или перезапускать весь сервер ради ZikriLLah. Не запускать одновременно `npm start`, `npm run bot` и системную службу: это один и тот же бот.

Войти в root-shell и выполнить инвентаризацию:

```bash
sudo -i
whoami
cat /etc/os-release
uname -m
df -h / /var
free -h
ss -ltnp
systemctl list-units --type=service --state=running --no-pager
ls -l /etc/nginx/sites-enabled/
```

Вывод `whoami` должен быть `root`. Если уже root, `sudo -i` не нужен. Для небольшого старта ориентир — запас 512 МБ RAM и 1–2 ГБ диска плюс медиа и резервные копии; это ориентир, не результат нагрузочного теста. Контролируйте рост данных.

Проверить, что предлагаемые имена не принадлежат другому проекту:

```bash
getent passwd zikrillah || true
ls -ld /opt/zikrillah /etc/zikrillah /var/lib/zikrillah 2>/dev/null || true
systemctl status zikrillah.service --no-pager || true
ss -ltnp 'sport = :3107'
```

При занятом 3107 выбрать свободный порт, например 3108, и **везде ниже** заменить 3107: env, Nginx, туннель и проверки. Чужой процесс не останавливать. Если каталог/служба уже существуют, сначала выяснить, не является ли это прежней установкой ZikriLLah; для неё использовать раздел обновления, не клонировать поверх.

## 4. Подготовка каталогов и получение кода

На Ubuntu установить недостающие утилиты. Не выполнять общий `apt upgrade` в рамках этой задачи.

```bash
apt-get update
apt-get install --no-upgrade -y ca-certificates curl git xz-utils python3 sqlite3
useradd --system --user-group --home-dir /var/lib/zikrillah --shell /usr/sbin/nologin zikrillah
install -d -o root -g root -m 755 /opt/zikrillah
install -d -o root -g root -m 700 /etc/zikrillah
install -d -o zikrillah -g zikrillah -m 700 /var/lib/zikrillah
git clone https://github.com/itjmu/ZikriLLah.git /opt/zikrillah/app
git -C /opt/zikrillah/app rev-parse HEAD
```

Команда `useradd` предназначена для первой установки после проверки отсутствия пользователя. Код принадлежит root; служба не может переписывать собственные исходники. Сохранить SHA коммита в акте установки. Не выполнять команды из случайных изменённых файлов без просмотра изменений.

## 5. Изолированная установка Node.js

Не использовать `apt install nodejs` и не менять `/usr/bin/node`: версия дистрибутива может не подходить, а другие проекты могут зависеть от своей версии.

Следующий блок скачивает текущую сборку ветки 22 с официального сайта и проверяет SHA256 из того же каталога. Переменные относятся только к этой Bash-сессии.

```bash
set -e
case "$(uname -m)" in
  x86_64) ZIKR_ARCH=x64 ;;
  aarch64|arm64) ZIKR_ARCH=arm64 ;;
  *) echo 'Неподдерживаемая архитектура; установка остановлена'; exit 1 ;;
esac
ZIKR_DOWNLOAD=$(mktemp -d)
cd "$ZIKR_DOWNLOAD"
curl -fSLO https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt
ZIKR_ARCHIVE=$(awk -v suffix="-linux-$ZIKR_ARCH.tar.xz" 'index($2,suffix) && $2 ~ /^node-v22[.]/ {print $2}' SHASUMS256.txt)
test -n "$ZIKR_ARCHIVE"
test "$(printf '%s\n' "$ZIKR_ARCHIVE" | wc -l)" -eq 1
curl -fSLO "https://nodejs.org/dist/latest-v22.x/$ZIKR_ARCHIVE"
awk -v name="$ZIKR_ARCHIVE" '$2==name' SHASUMS256.txt | sha256sum -c -
test ! -e /opt/zikrillah/node
install -d -m 755 /opt/zikrillah/node
tar -xJf "$ZIKR_ARCHIVE" --strip-components=1 -C /opt/zikrillah/node
/opt/zikrillah/node/bin/node --version
/opt/zikrillah/node/bin/node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(':memory:');console.log(db.prepare('SELECT 1 AS ok').get());db.close()"
cd /opt/zikrillah/app
PATH=/opt/zikrillah/node/bin:$PATH npm test
```

Ожидается версия `v22.x` не ниже 22.18, `{ ok: 1 }` и успешные тесты. Предупреждение об экспериментальном SQLite само по себе не ошибка. Для 0.12 ожидается 45 Node-тестов; после обновлений количество может измениться. `npm install`/`npm ci` не нужны: внешних зависимостей и lock-файла сейчас нет. Не запускать `npm ci` без lock-файла.

## 6. Перенос базы и секретных настроек

### 6.1. Подготовка копии на прежнем компьютере

Остановить **только прежний ZikriLLah** и его отдельный API, если он ещё запущен. Во время остановки APK продолжает считать офлайн. После остановки скопировать целиком `data/`, включая `zikrillah.sqlite`, `media/` и SQLite-файлы `-wal`/`-shm`, если они присутствуют. Не копировать только основной `.sqlite` из работающего приложения: последние записи могут находиться в WAL.

Не возобновлять старый экземпляр после финального копирования. Передать папку через SFTP в закрытый временный каталог сервера, например `/root/zikrillah-transfer/data`. Секретный env передать туда же как `zikrillah.env`. Через GitHub эти файлы не передаются.

### 6.2. Установка данных на сервер

Для переноса существующей истории выполнить **до первого запуска**, только в пустой каталог данных:

```bash
test -f /root/zikrillah-transfer/data/zikrillah.sqlite
test -z "$(find /var/lib/zikrillah -mindepth 1 -maxdepth 1 -print -quit)"
cp -a /root/zikrillah-transfer/data/. /var/lib/zikrillah/
chown -R zikrillah:zikrillah /var/lib/zikrillah
chmod -R go-rwx /var/lib/zikrillah
runuser -u zikrillah -- sqlite3 /var/lib/zikrillah/zikrillah.sqlite 'PRAGMA integrity_check;'
```

Ожидается `ok`. При другой строке остановиться и работать с резервной копией; базу не удалять. Для действительно новой установки этот блок пропустить.

### 6.3. Установка env

```bash
install -o root -g root -m 600 /root/zikrillah-transfer/zikrillah.env /etc/zikrillah/zikrillah.env
nano /etc/zikrillah/zikrillah.env
```

В файл должны входить эти строки (токен и ID сохранять из полученного закрытого файла):

```dotenv
BOT_TOKEN=СЕКРЕТНЫЙ_ТОКЕН_ЭТОГО_БОТА
ADMIN_IDS=ЧИСЛОВЫЕ_ID_ЧЕРЕЗ_ЗАПЯТУЮ
HOST=127.0.0.1
PORT=3107
DATA_DIR=/var/lib/zikrillah
BOT_API_ENABLED=1
PUBLIC_URL=https://ВАШ_HTTPS_АДРЕС
```

| Переменная | Значение и назначение |
|---|---|
| `BOT_TOKEN` | Существующий токен ZikriLLah. Не создавать другого бота вместо действующего |
| `ADMIN_IDS` | Telegram ID, не `@username`. Сохранить полученные значения; пустая строка закрывает админ-панель всем |
| `HOST` | Только `127.0.0.1`: внешний доступ через HTTPS-прокси |
| `PORT` | Свободный порт, выбранный в разделе 3 |
| `DATA_DIR` | Абсолютный постоянный каталог базы и медиа |
| `BOT_API_ENABLED` | `1`, чтобы один процесс обслуживал бот, API и веб |
| `PUBLIC_URL` | HTTPS-корень, без пути, query и завершающего `/`; для временного туннеля пока оставить пустое значение |

Не добавлять `export`, shell-команды и пробелы вокруг `=`. Не выполнять `source` для полученного env. Служба читает его через `EnvironmentFile`. Изменения применяются после `systemctl restart zikrillah`, а не автоматически. Не помещать env в `/opt/zikrillah/app/web`.

## 7. Проверка Telegram до запуска

Команда читает секрет из файла, вызывает только `getMe` и `getWebhookInfo`, выводит имя бота и факт наличия webhook. Токен не печатается и не попадает в аргументы процесса:

```bash
/opt/zikrillah/node/bin/node --env-file=/etc/zikrillah/zikrillah.env --input-type=module <<'JS'
const token=process.env.BOT_TOKEN;
if(!token)throw Error('BOT_TOKEN missing');
for(const method of ['getMe','getWebhookInfo']){
  const r=await fetch('https://api.telegram.org/bot'+token+'/'+method,{signal:AbortSignal.timeout(15000)});
  const j=await r.json();
  if(!j.ok)throw Error('Telegram '+j.error_code+': '+j.description);
  console.log(method==='getMe'?{bot:j.result.username,id:j.result.id}:{webhookConfigured:Boolean(j.result.url),pending:j.result.pending_update_count});
}
JS
```

Убедиться, что имя совпадает с действующим ботом проекта. При `webhookConfigured: true` и подтверждённом переходе именно этого бота на polling удалить его прежний webhook следующей командой. Она **не удаляет ожидающие сообщения**:

```bash
/opt/zikrillah/node/bin/node --env-file=/etc/zikrillah/zikrillah.env --input-type=module <<'JS'
const r=await fetch('https://api.telegram.org/bot'+process.env.BOT_TOKEN+'/deleteWebhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({drop_pending_updates:false}),signal:AbortSignal.timeout(15000)});
const j=await r.json();if(!j.ok)throw Error('Telegram '+j.error_code);console.log('Webhook removed:',j.result);
JS
```

Telegram webhook и `getUpdates` вместе не используются. Другие боты не затрагиваются. Исходящая сеть должна разрешать DNS и HTTPS к Telegram; входящий webhook-порт нашему боту не нужен.

## 8. Запуск службы

Перед первым запуском проверить перенесённую очередь рассылок: активная рассылка может продолжиться после запуска. Не создавать тестовую рассылку всем пользователям. При наличии незавершённой реальной кампании учитывать её как часть переноса.

```bash
install -m 644 /opt/zikrillah/app/deploy/zikrillah.service /etc/systemd/system/zikrillah.service
systemd-analyze verify /etc/systemd/system/zikrillah.service
systemctl daemon-reload
systemctl enable --now zikrillah.service
systemctl status zikrillah.service --no-pager
journalctl -u zikrillah.service -n 50 --no-pager
curl --fail --silent --show-error http://127.0.0.1:3107/api/content
curl --fail --silent --show-error http://127.0.0.1:3107/ | head -c 100
```

Ожидается `active (running)`, JSON с `content`/`experience`, затем HTML страницы. `content: null` — нормальное отсутствие опубликованной новости. Отдельного `/health` в приложении нет. `/api/content` подтверждает работу HTTP и чтение данных, **но не исправность Telegram polling**: её проверяют сообщением `/start`.

## 9. HTTPS — выбрать ровно один вариант

### Вариант A: постоянный адрес через существующий Nginx

Предпочтителен для постоянной эксплуатации. Можно выделить поддомен уже принадлежащего администратору домена, без покупки нового. Администратор создаёт DNS A-запись на публичный IP сервера. AAAA добавлять только при действительно настроенном IPv6; шаблоны ниже слушают IPv4.

Заменить `zikrillah.example.com` **во всех местах** на выделенное имя. Нельзя назначать имя, уже обслуживающее чужой проект. Сайт должен находиться в корне отдельного hostname: пути ресурсов в текущем вебе абсолютные.

```bash
nginx -t
getent ahostsv4 zikrillah.example.com
install -d -m 755 /var/www/zikrillah-acme
test ! -e /etc/nginx/sites-available/zikrillah
cp /opt/zikrillah/app/deploy/nginx-http.conf /etc/nginx/sites-available/zikrillah
nano /etc/nginx/sites-available/zikrillah
ln -s /etc/nginx/sites-available/zikrillah /etc/nginx/sites-enabled/zikrillah
nginx -t && systemctl reload nginx
```

Первый `nginx -t` нужен до изменений: не исправлять посторонние конфигурации наугад. `reload` выполняется только после успешной проверки. Файлы других сайтов и default_server не изменять. Не добавлять второй Nginx/Caddy на уже занятые 80/443.

Порты 80/443 должны быть доступны снаружи по существующим правилам firewall/провайдера. Не включать и не сбрасывать UFW без учёта SSH и других сервисов. Порт 3107 наружу не открывать.

Использовать уже установленный Certbot. Если его нет, администратор устанавливает его штатным способом Ubuntu (`apt-get install --no-upgrade -y certbot`), не создавая второй конфликтующий способ установки поверх snap/pip. Для данного рецепта nginx-плагин не требуется: webroot не переписывает чужие сайты.

```bash
certbot certonly --webroot -w /var/www/zikrillah-acme \
  --cert-name zikrillah.example.com -d zikrillah.example.com
```

Ввести служебный email администратора и ознакомиться с условиями удостоверяющего центра. После успешной выдачи:

```bash
cp /opt/zikrillah/app/deploy/nginx-https.conf /etc/nginx/sites-available/zikrillah
nano /etc/nginx/sites-available/zikrillah
nginx -t && systemctl reload nginx
certbot renew --cert-name zikrillah.example.com --dry-run
systemctl list-timers --all --no-pager | grep -i certbot
```

В новом конфиге заменить hostname и оба пути сертификата, а при необходимости порт upstream. Если сертификат уже есть, использовать его реальные пути, не заказывать дубликат без необходимости. Настроить reload Nginx после продления, если это ещё не сделано существующим механизмом:

```bash
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/zikrillah-nginx.sh <<'SH'
#!/bin/sh
case "$RENEWED_LINEAGE" in
  /etc/letsencrypt/live/zikrillah.example.com) /usr/sbin/nginx -t && /usr/bin/systemctl reload nginx ;;
esac
SH
nano /etc/letsencrypt/renewal-hooks/deploy/zikrillah-nginx.sh
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/zikrillah-nginx.sh
```

В hook также заменить имя. Убедиться, что выбранный способ установки Certbot имеет активный timer/cron; для apt-установки обычно `systemctl enable --now certbot.timer`. Не создавать дублирующий таймер, если уже используется snap/другой рабочий механизм.

В env установить `PUBLIC_URL=https://выбранное-имя`, перезапустить только ZikriLLah. Перейти к разделу 10.

### Вариант B: временный запуск без своего домена и без изменения Nginx

Если постоянного имени сейчас нет, использовать Cloudflare Quick Tunnel. Он даёт случайный HTTPS-адрес и не требует собственного домена. Это **временный тестовый вариант**: без гарантии доступности, до 200 одновременных запросов; адрес после перезапуска может измениться. Не обещать постоянную работу уже привязанных APK при смене адреса.

Скачать отдельный бинарник из официального репозитория Cloudflare, не заменяя чужую установку cloudflared:

```bash
case "$(uname -m)" in
  x86_64) ZIKR_CF_ARCH=amd64 ;;
  aarch64|arm64) ZIKR_CF_ARCH=arm64 ;;
  *) echo 'Unsupported architecture'; exit 1 ;;
esac
curl -fSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$ZIKR_CF_ARCH" -o /opt/zikrillah/cloudflared
chmod 755 /opt/zikrillah/cloudflared
/opt/zikrillah/cloudflared --version
install -m 644 /opt/zikrillah/app/deploy/zikrillah-tunnel.service /etc/systemd/system/zikrillah-tunnel.service
systemctl daemon-reload
systemctl enable --now zikrillah-tunnel.service
journalctl -u zikrillah-tunnel.service -n 100 --no-pager
```

Найти в журнале `https://...trycloudflare.com`. Исходящий TCP 7844 нужен для выбранного `http2`, а также обычные DNS/HTTPS; входящие 80/443 этому варианту не нужны. Если 7844 запрещён политикой сервера, администратор использует вариант A или разрешённый им туннель; firewall других проектов не сбрасывать.

```bash
nano /etc/zikrillah/zikrillah.env
# В редакторе установить PUBLIC_URL в полученный HTTPS-адрес.
systemctl restart zikrillah.service
```

При каждом изменении адреса повторить изменение env, перезапуск бота и проверку клиентов. Обновить необязательную кнопку BotFather, если её настраивали. APK нужно перепривязать к новому адресу через новый `/link`; переустановка не нужна. Веб-история хранится по origin: перед сменой адреса синхронизировать старую вкладку, не очищать её данные. Сервис туннеля сам **не обновляет** PUBLIC_URL и настройки телефонов.

## 10. Внешняя проверка и подключение клиентов

Подставить реальный адрес, проверять также с другой сети/телефона:

```bash
curl --fail --silent --show-error https://ВАШ_АДРЕС/api/content
curl -sS -o /dev/null -w '%{http_code}\n' https://ВАШ_АДРЕС/
curl -sS -o /dev/null -w '%{http_code}\n' https://ВАШ_АДРЕС/.env
curl -sS -o /dev/null -w '%{http_code}\n' https://ВАШ_АДРЕС/data/zikrillah.sqlite
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'Content-Type: application/json' -d '{"events":[]}' https://ВАШ_АДРЕС/api/sync
```

Ожидается JSON, затем коды **200, 404, 404, 401**. Не использовать `curl -k`: сертификат должен действительно проходить проверку. Не настраивать Nginx на раздачу корня Git-проекта; он проксирует запросы приложению с разрешённым списком ресурсов.

### Telegram

1. В личном чате с существующим ботом отправить `/start`; проверить ответ и кнопку веб-приложения.
2. Нажать веб-кнопку: должен открыться правильный HTTPS-адрес.
3. `/id` показывает числовой ID. `/admin` доступен только перечисленным в `ADMIN_IDS`.
4. При желании владелец бота настраивает Menu Button через BotFather на тот же HTTPS-адрес. Это не препятствует запуску: встроенная inline-кнопка уже работает.

### Веб / Telegram Mini App

Открыть адрес, выбрать подключение Telegram. В боте получить `/link`, ввести выданный код в вебе. Код одноразовый, срок — 10 минут; новый `/link` отменяет предыдущий код того же пользователя. Само открытие Mini App **не авторизует** пользователя по Telegram initData: используется явная привязка кодом.

После первого онлайн-открытия статические ресурсы доступны офлайн. Не очищать localStorage/данные сайта при наличии неотправленных нажатий. Веб периодически синхронизируется, когда открыт; закрытый браузер не гарантирует отправку.

### Android

Использовать существующий APK 0.12. На сервере собирать APK не требуется, секретный BOT_TOKEN в APK не вставляется. В приложении выбрать подключение Telegram, ввести **HTTPS-корень без завершающего слеша** и отдельный свежий код `/link`. APK принимает только HTTPS. Нажатия сохраняются локально в SQLite.

Для обновления существующей установки APK должен иметь ту же подпись. Сборка debug на другом компьютере обычно имеет другой ключ, и установка поверх прежней не пройдёт. **Не советовать удалять приложение:** это может удалить офлайн-историю. Ключ подписи передаётся отдельно только при необходимости дальнейшей сборки; он не нужен для запуска сервера и не должен попадать в GitHub. Публикация в Google Play и release-подпись этой инструкцией не настраиваются.

## 11. Как на самом деле работает синхронизация 0.12

- Общее между ботом, вебом и связанным APK: записи счёта, собственные зикры, отметки удаления собственных зикров. Оформление/порядок/параметры практики в основном локальны для каждого клиента; полное зеркалирование всех настроек не реализовано.
- Каждое нажатие имеет уникальный ID; повторная отправка не должна увеличивать результат. Синхронизируются события, а не просто последнее число.
- APK планирует фоновую отправку после сворачивания/выхода. Максимум **5 попыток на установку APK за местные календарные сутки**, включая неудачные запросы. Это не глобальная квота на аккаунт или сервер и не лимит веба/бота.
- Пока APK на переднем плане, новый фоновый обмен не начинается. Android может отложить работу; «после выхода» не означает «в ту же секунду». Уже начавшийся запрос может завершиться после возвращения в приложение.
- После пятой попытки очередь остаётся до следующих суток. После ошибки повтор откладывается минимум на 15 минут и подчиняется тому же лимиту. Принудительная остановка Android требует последующего открытия приложения.
- Пакет исходящих нажатий APK ограничен 5000 событиями; очень большая очередь передаётся несколькими обменами в пределах квоты. APK получает новые серверные записи по курсору. Первый обмен может содержать всю серверную историю.
- Новость, темы, фоны и объявления APK получает вместе с очередным обменом, поэтому изменения администратора не мгновенные. Без привязки APK серверные объявления не получает.
- Уведомления администратора — не FCM/push. Их срок действия 24 часа; при долгом офлайне уведомление может истечь до получения. Напоминание 07:00 — отдельное локальное уведомление Android, без cron сервера; зависит от разрешений и энергосбережения телефона.

В Telegram есть отдельная массовая рассылка через админ-панель. Она работает с пользователями бота и не является отправкой push на телефоны. Подробности публикаций — [ADMIN.md](ADMIN.md). Отправку всем не использовать как тест установки.

## 12. Приёмочная проверка

Использовать тестовый Telegram-аккаунт, чтобы не добавлять вымышленные нажатия владельцу. Не изменять чужие данные SQL-командами.

| Проверка | Действие | Ожидаемый результат |
|---|---|---|
| Служба | `systemctl is-active zikrillah` | `active` |
| Telegram | `/start`, затем несколько нажатий | Бот отвечает, счёт меняется |
| Веб | HTTPS и привязка отдельным `/link` | История того же аккаунта доступна |
| APK офлайн | Отключить Интернет, сделать 3 нажатия | Счёт сохраняется при повторном открытии |
| APK → сервер | Включить Интернет, свернуть APK | После фонового обмена +3 видны в статистике бота/веба |
| Сервер → APK | Добавить 1 в боте, открыть и свернуть APK | После следующего доступного обмена запись появляется в APK |
| Идемпотентность | Повторить обмен без новых нажатий | Итог не растёт |
| Обновление службы | `systemctl restart zikrillah` | История и привязки сохранены, `/start` отвечает |
| Доступ к секретам | URL из раздела 10 | env и база дают 404 |
| Резервирование | Создать и проверить архив по разделу 13 | Архив читается, есть база, медиа и env |

При проверке APK учитывать уже использованную дневную квоту; отсутствие шестого обмена не считать поломкой. Не менять системную дату ради обхода лимита. Не очищать данные приложения. Не перезагружать весь сервер без согласованного окна для других проектов; автозапуск проверить через `systemctl is-enabled`.

## 13. Резервные копии

В репозитории готов `deploy/backup.sh`. Он на короткое время останавливает **только ZikriLLah**, архивирует каталог данных и env, записывает SHA коммита и контрольную сумму, затем возвращает службу в прежнее активное состояние. Копирование согласованное, включая WAL и медиа. Во время паузы APK считает офлайн; Telegram-ответы задерживаются.

```bash
bash /opt/zikrillah/app/deploy/backup.sh
ls -lh /var/backups/zikrillah/
install -m 644 /opt/zikrillah/app/deploy/zikrillah-backup.service /etc/systemd/system/
install -m 644 /opt/zikrillah/app/deploy/zikrillah-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now zikrillah-backup.timer
systemctl list-timers zikrillah-backup.timer --no-pager
```

Ежедневный запуск около 04:20 **по времени сервера**, с задержкой до 5 минут. При большом объёме медиа пауза увеличится; тогда перейти на проверенные согласованные снапшоты/онлайн-резервирование, а не просто копировать работающий SQLite-файл.

Архивы содержат токен и пользовательские данные. Хранить с доступом root, отправлять копию на отдельное защищённое хранилище средствами администратора. Не класть в веб-каталог/GitHub. Скрипт намеренно ничего не удаляет автоматически: настроить хранение, например 14 ежедневных и 4 недельных копии, и мониторинг свободного диска по правилам сервера. Копия на том же диске не защищает от потери сервера.

## 14. Обновление из GitHub и откат

Обновлять только этот каталог и эту службу. Не хранить рабочие изменения прямо в серверном клоне. Посмотреть изменения до выполнения нового кода:

```bash
cd /opt/zikrillah/app
git status --short
git fetch origin
git log --oneline HEAD..origin/main
git diff --stat HEAD..origin/main
git diff HEAD..origin/main -- package.json deploy/ server/ bot/
```

Если рабочее дерево не чистое — сначала сохранить и разобрать изменения; не делать `reset --hard`. Перед обновлением:

```bash
bash /opt/zikrillah/app/deploy/backup.sh
git rev-parse HEAD > /var/backups/zikrillah/pre-update.commit
systemctl stop zikrillah.service
git pull --ff-only origin main
PATH=/opt/zikrillah/node/bin:$PATH npm test
```

Если тесты не прошли, не запускать новую версию. Для отката к только что сохранённой версии при чистом рабочем дереве:

```bash
git switch --detach "$(cat /var/backups/zikrillah/pre-update.commit)"
systemctl start zikrillah.service
```

Если тесты прошли, прочитать изменения конфигураций: при изменении unit установить обновлённый файл из `deploy`, выполнить `systemctl daemon-reload`. Не копировать Nginx-шаблон поверх настроенного hostname без подстановок. Затем:

```bash
systemctl start zikrillah.service
curl --fail --silent --show-error http://127.0.0.1:3107/api/content
journalctl -u zikrillah -n 30 --no-pager
```

Проверить `/start`, внешний HTTPS и историю. Env и база находятся вне Git, поэтому `git pull` их не заменяет. Для следующего обновления после отката вернуть `git switch main` перед обычной процедурой. Откат кода не отменяет миграции базы: если будущая версия изменит формат несовместимо, потребуется восстановление согласованной копии данных, с потерей новых записей после неё. Не восстанавливать старую базу без необходимости.

Веб обновить обычной перезагрузкой/закрытием и открытием Mini App; не очищать данные сайта ради сброса кэша при наличии офлайн-записей. APK обновляется отдельно файлом с той же подписью. Обновление сервера само не устанавливает новый APK.

## 15. Восстановление из копии

Выбрать проверенный архив, подставить его полный путь. Не восстанавливать вслепую поверх работающей базы. Проверить контрольную сумму и содержимое:

```bash
ZIKR_BACKUP=/var/backups/zikrillah/ЗАМЕНИТЬ_НА_ИМЯ.tar.gz
sha256sum -c "$ZIKR_BACKUP.sha256"
tar -tzf "$ZIKR_BACKUP"
systemctl stop zikrillah-backup.timer
systemctl stop zikrillah.service
ZIKR_RECOVERY=$(date -u +%Y%m%dT%H%M%SZ)
mv /var/lib/zikrillah "/var/lib/zikrillah-before-$ZIKR_RECOVERY"
mv /etc/zikrillah "/etc/zikrillah-before-$ZIKR_RECOVERY"
tar -xzf "$ZIKR_BACKUP" -C /
chown -R zikrillah:zikrillah /var/lib/zikrillah
chmod -R go-rwx /var/lib/zikrillah
chmod 700 /etc/zikrillah
chmod 600 /etc/zikrillah/zikrillah.env
runuser -u zikrillah -- sqlite3 /var/lib/zikrillah/zikrillah.sqlite 'PRAGMA integrity_check;'
```

Извлекать только собственный доверенный архив, который содержит `var/lib/zikrillah` и `etc/zikrillah`. Проверить `ok`; в env проверить актуальный HTTPS-адрес, особенно для туннеля. При необходимости вернуть совместимый коммит из файла `.commit` рядом с архивом. Затем `systemctl start zikrillah` и `systemctl start zikrillah-backup.timer`, выполнить приёмочную проверку. Переименованные каталоги не удалять до успешной проверки. Восстановление очереди рассылок может вернуть старое состояние кампаний — учитывать это до запуска.

## 16. Диагностика

| Симптом | Что проверить / сделать |
|---|---|
| `node:sqlite` не найден | `ExecStart` и версию именно `/opt/zikrillah/node/bin/node`, не системного Node |
| `EADDRINUSE` | `ss -ltnp 'sport = :3107'`; выбрать свободный порт, не убивать чужой процесс |
| Служба падает сразу | `journalctl -u zikrillah -n 100`; env, токен, права `/var/lib/zikrillah`, синтаксис unit |
| `start-limit-hit` | Исправить причину, затем `systemctl reset-failed zikrillah` и `systemctl start zikrillah` |
| HTTP работает, бот молчит | Проверить `getMe`/webhook из раздела 7, старую копию этого бота, доступ к Telegram; HTTP не проверяет polling |
| Telegram 409 / постоянные повторы | Два polling-процесса или прежний webhook. Остановить только дубликат ZikriLLah |
| `/admin` недоступен | Проверить числовой ID и `ADMIN_IDS`, перезапустить службу; username не подходит |
| Веб-кнопка отсутствует/старый адрес | `PUBLIC_URL` должен начинаться с HTTPS; перезапуск службы и новое `/start` |
| Nginx 502 | `systemctl status zikrillah`; curl внутреннего порта; совпадение upstream с env |
| Сертификат не выдаётся | DNS A/AAAA, внешний порт 80, корректный server_name, ACME webroot; чужой сайт не отключать |
| APK отвергает адрес | Корень HTTPS с действующим сертификатом, без `/` в конце/пути/query; не HTTP и не самоподписанный сертификат |
| Код привязки не принимается | Свежий `/link` для каждого клиента; код живёт 10 минут и используется один раз |
| APK не отправляет сразу | Интернет, сворачивание, квота 5 попыток, ограничения Android, доступность прежнего URL |
| После переноса 401 | Утеряна/заменена база токенов; восстановить полную прежнюю базу либо перепривязать клиент, не очищая его историю |
| После восстановления не приходит часть истории APK | Курсор мог быть выше восстановленного состояния; повторная привязка APK сбрасывает курсор. Записи после даты копии сервер восстановить сам не может |
| Новость/уведомление APK не пришли | Привязка, следующий обмен, квота, срок объявления, разрешение уведомлений; это не push |
| Нет вибрации | Системная вибрация касаний, режим тишины, настройки приложения и возможности устройства; сервер это не исправляет |
| Медиа исчезло | Перенесён ли `media/`, права чтения, ответ `/media/...`; одна SQLite-база не содержит сами изображения |
| SQLite locked / read-only | Один процесс, правильный владелец каталога и WAL, свободный диск; не удалять WAL для «лечения» |
| Tunnel недоступен | Журнал отдельной службы, TCP 7844, текущий случайный URL; настройки чужого cloudflared не менять |

Журналы: `journalctl -u zikrillah -f`, для туннеля `journalctl -u zikrillah-tunnel -f`, для сайта `/var/log/nginx/zikrillah-error.log`. Перед передачей журналов третьим лицам убрать секреты и пользовательские данные. Не присылать полный env и содержимое базы в публичные Issues.

## 17. Что учитывать при публичном размещении

Текущая версия — небольшой сервис с одной SQLite-базой, не кластер. Не запускать несколько экземпляров бота и не помещать SQLite на общий сетевой диск. Нет встроенной распределённой очереди, rate limiting API и централизованного мониторинга; администратор добавляет ограничения/мониторинг на своей инфраструктуре по фактической нагрузке. Не включать интерактивную CAPTCHA/Basic Auth на `/api/*`: APK её не умеет проходить.

Объявления, темы и опубликованные медиа доступны по публичному HTTPS-адресу. Не публиковать в них конфиденциальные материалы. Сам репозиторий содержит исходники, но не серверные данные. Публичность GitHub не означает, что база, env или серверный порт должны стать публичными.

Администратор фиксирует в своём закрытом журнале: итоговый URL, имя Telegram-бота, SHA коммита, версию Node, пути, порт, дату резервной копии и результат проверок. После установки передаёт владельцу только рабочий адрес, результат проверки и при необходимости инструкцию перепривязки APK — без токенов в публичных сообщениях.

## 18. Официальные справочники

- [Node.js: официальные сборки ветки 22](https://nodejs.org/dist/latest-v22.x/) — загрузка и контрольные суммы.
- [Telegram getUpdates](https://core.telegram.org/bots/api#getupdates) и [deleteWebhook](https://core.telegram.org/bots/api#deletewebhook) — режим получения обновлений.
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps) — HTTPS и способы открытия веб-приложения.
- [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/) — временные адреса и ограничения.
- [Cloudflare: сеть и firewall](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/) — исходящие подключения туннеля.
- [Certbot](https://certbot.eff.org/) — выдача и продление HTTPS-сертификатов.

При расхождении с историческими разделами README инструкции этого документа относятся к текущей схеме 0.12: **один бот+API процесс, отдельные секреты/данные и пакетная синхронизация APK**.
