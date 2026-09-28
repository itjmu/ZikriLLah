package app.zikrillah;
import java.util.HashMap;
import java.util.Map;

public final class UiText {
    private static final Map<String,String> EN=new HashMap<>();
    static {
        String[][] pairs={{"Часы","Clock"},{"Скрытый режим · часы","Discreet mode · clock"},{"Проверить вибрацию","Test vibration"},{"В скрытом режиме тап считает зикр. Выход: меню → другая тема. Это не системная блокировка.","Taps count dhikr in discreet mode. Exit: menu → another theme. This is not the system lock screen."},{"Отправлен длинный сигнал. Проверьте настройки вибрации телефона, если его не ощущаете.","Long feedback requested. If you feel nothing, check phone vibration settings."},{"Вибрация недоступна на этом устройстве.","Vibration is unavailable on this device."},{"Добавить свой зикр","Add your own dhikr"},{"Другое количество","Custom target"},{"Название","Name"},{"Арабский текст (необязательно)","Arabic text (optional)"},{"Перевод (необязательно)","Meaning (optional)"},{"Введите название. Лимит: 200 своих зикров.","Enter a name. Limit: 200 custom dhikrs."},
            {"Меню","Menu"},{"Настройки","Settings"},{"Статистика","Statistics"},{"Зикры","Dhikr"},{"Язык","Language"},{"Тема","Theme"},{"Назад","Back"},{"Закрыть","Close"},
            {"Светлая","Light"},{"Тёмная","Dark"},{"Чёрная","Black"},{"Изумрудная","Emerald"},{"Цель круга","Round target"},{"Дневная цель","Daily target"},{"Интервал нажатий","Tap interval"},{"мс","ms"},
            {"Вибрация","Vibration"},{"Текст зикра","Dhikr text"},{"Смена зикра после круга","Next dhikr after each round"},{"вкл","on"},{"выкл","off"},
            {"Сегодня","Today"},{"Вчера","Yesterday"},{"За этот месяц","This month"},{"Всего","Total"},{"Полных кругов","Completed rounds"},{"Первая запись","First entry"},{"Последняя запись","Last entry"},{"Следующая отметка","Next milestone"},
            {"Подключить Telegram","Connect Telegram"},{"Telegram подключён","Telegram connected"},{"На устройстве","Saved on this device"},{"В очереди","Pending"},{"Автосинхронизация включена","Automatic sync is enabled"},
            {"Выберите зикр","Choose dhikr"},{"Субханаллах","Subhanallah"},{"Альхамдулиллях","Alhamdulillah"},{"Аллаху акбар","Allahu akbar"},{"Пречист Аллах","Glory be to Allah"},{"Хвала Аллаху","Praise be to Allah"},{"Аллах велик","Allah is the Greatest"},
            {"Ваша дневная цель","Your daily target"},{"Комфортное для вас количество зикров","Choose a comfortable daily target"},{"Отмена","Cancel"},{"Сохранить","Save"},{"От 1 до 100 000","From 1 to 100,000"},
            {"Нажатие не сохранено. Проверьте свободное место.","Tap not saved. Check free storage."},{"Одноразовый код /link из бота","One-time /link code from your bot"},{"Позже","Later"},{"Подключить","Connect"},{"Подключаем…","Connecting…"},
            {"Введите код, полученный по /link","Enter the code received via /link"},{"Введите адрес сервера и код из бота один раз. Дальше прогресс объединяется автоматически.","Enter the server address and a code from your bot once. Your progress will then sync automatically."},
            {"Не удалось подключиться. Проверьте HTTPS-адрес и получите новый /link в боте.","Could not connect. Check the HTTPS address and request a new /link code."}
        };
        for(String[] pair:pairs)EN.put(pair[0],pair[1]);
    }
    public static String get(String value,boolean english){return english?EN.getOrDefault(value,value):value;}
}
