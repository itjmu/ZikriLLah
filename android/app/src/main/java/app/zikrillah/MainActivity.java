package app.zikrillah;

import android.app.*;
import android.os.*;
import android.content.res.ColorStateList;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.view.*;
import android.widget.*;
import org.json.JSONObject;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class MainActivity extends Activity {
    private int background=Color.rgb(11,23,26),cardColor=Color.rgb(18,34,38),mint=Color.rgb(149,226,192),muted=Color.rgb(145,166,165),white=Color.rgb(235,244,236);
    private ZikrStore store;
    private Haptics haptics;
    private ClickSound clickTone;
    private boolean soundEnabled(){return store.enabled("soundEnabled",true);}
    private boolean vibrationEnabled(){return store.enabled("vibrationEnabled",true);}
    private boolean silent(){return store.enabled("silent",false);}
    private void feedback(boolean complete){if(FeedbackPolicy.sound(soundEnabled(),silent(),stealth())&&clickTone!=null)clickTone.play(complete,store.value("clickSound","beads"));if(FeedbackPolicy.vibration(vibrationEnabled(),silent(),stealth(),complete))haptics.pulse(complete);}
    private LinearLayout clockFace;
    private ScrollView menuScroll;
    private TextView clockTime,clockDate,clockCount;
    private boolean stealth(){return store.enabled("stealthMode",false);}
    private PublicationView publicationView;
    private String visualSignature="";
    private String z(int index,String field){JSONObject item=store.zikr(index);String key=english()&&field.equals("name")?"englishName":english()&&field.equals("meaning")?"englishMeaning":field;return item.optString(key,item.optString(field,""));}
    private TextView arabicText,nameText,meaningText,status,dailyCount,journeyCount,dailyPercent,milestone,connection,roundMessage;
    private Button menuButton;
    private boolean routeToMenu;
    private final TapGate tapGate=new TapGate();
    private final TapGesture tapGesture=new TapGesture();
    private TasbihView tasbih;
    private ProgressBar dailyProgress,milestoneProgress;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private boolean linking;
    private final Runnable ticker=new Runnable(){@Override public void run(){if(!visualSignature.equals(Experience.signature(MainActivity.this,store)))buildScreen();else render();handler.postDelayed(this,stealth()?1000:10000);}};
    @Override public void onCreate(Bundle saved){super.onCreate(saved);if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::confirmExit);store=ZikrStore.get(this);if(store.value("soundEnabled","").isEmpty()){int mode=store.number("feedbackMode",0);store.put("soundEnabled",String.valueOf(mode==0));store.put("vibrationEnabled",String.valueOf(mode<2));store.put("silent",String.valueOf(mode==2));}if("stealth".equals(store.value("theme","emerald"))){store.put("stealthMode","true");String previous=store.value("previousTheme","emerald");store.put("theme","stealth".equals(previous)?"emerald":previous);}Reminders.schedule(this);haptics=new Haptics(this);clickTone=new ClickSound(this);buildScreen();if(!store.enabled("onboarded",false)&&!store.linked()&&store.total()==0)showWelcome();}
    private boolean english(){return "en".equals(store.value("language","ru"));}
    private String t(String value){return UiText.get(value,english());}
    private void palette(){
        String theme=stealth()?"black":Experience.themeId(store);
        if(theme.equals("light")){background=Color.rgb(246,245,239);cardColor=Color.WHITE;mint=Color.rgb(29,112,80);muted=Color.rgb(88,106,100);white=Color.rgb(20,43,36);}
        else if((theme.equals("black")||theme.equals("stealth"))){background=Color.BLACK;cardColor=Color.rgb(14,14,14);mint=Color.rgb(174,225,197);muted=Color.rgb(151,160,155);white=Color.WHITE;}
        else if(theme.equals("dark")){background=Color.rgb(18,23,34);cardColor=Color.rgb(28,35,48);mint=Color.rgb(171,192,245);muted=Color.rgb(150,162,183);white=Color.rgb(238,241,250);}
        else{background=Color.rgb(11,23,26);cardColor=Color.rgb(18,34,38);mint=Color.rgb(149,226,192);muted=Color.rgb(145,166,165);white=Color.rgb(235,244,236);}
    }
    private void applyRemotePalette(){if(stealth())return;JSONObject custom=Experience.theme(store);if(custom==null)return;try{background=Color.parseColor(custom.getString("background"));cardColor=Color.parseColor(custom.getString("surface"));mint=Color.parseColor(custom.getString("accent"));white=Color.parseColor(custom.getString("text"));muted=white;}catch(Exception ignored){}}
    private void buildScreen(){if(clickTone!=null)clickTone.refresh(this);
        palette();applyRemotePalette();visualSignature=Experience.signature(this,store);getWindow().setStatusBarColor(background);getWindow().setNavigationBarColor(background);
        getWindow().getDecorView().setSystemUiVisibility("light".equals(store.value("theme","emerald"))?View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR:0);
        FrameLayout root=new FrameLayout(this);root.setBackground(stealth()?new android.graphics.drawable.ColorDrawable(background):Experience.background(this,store,"main",background));setContentView(root);
        root.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});
        LinearLayout practice=column(8);practice.setVisibility(stealth()?View.GONE:View.VISIBLE);practice.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams center=new FrameLayout.LayoutParams(-1,-1);center.topMargin=dp(102);center.bottomMargin=dp(12);root.addView(practice,center);
        arabicText=center("",30,white);arabicText.setMaxLines(2);arabicText.setEllipsize(android.text.TextUtils.TruncateAt.END);practice.addView(arabicText);nameText=center("",19,white);nameText.setMaxLines(2);nameText.setEllipsize(android.text.TextUtils.TruncateAt.END);practice.addView(nameText);meaningText=center("",12,muted);meaningText.setMaxLines(2);meaningText.setEllipsize(android.text.TextUtils.TruncateAt.END);practice.addView(meaningText);
        tasbih=new TasbihView(this);tasbih.appearance(mint,muted,white,cardColor,english());
        LinearLayout.LayoutParams circle=new LinearLayout.LayoutParams(-1,0,1);practice.addView(tasbih,circle);
        // Physical input is consumed in dispatchTouchEvent. This listener is accessibility-only.
        tasbih.setOnClickListener(v->add());
        menuButton=button(stealth()?"↩":"☰",()->{if(stealth()){store.put("stealthMode","false");buildScreen();}else openMenu();});menuButton.setContentDescription(stealth()?(english()?"Exit discreet mode":"Выйти из скрытого режима"):t("Меню"));menuButton.setTextSize(28);FrameLayout.LayoutParams corner=new FrameLayout.LayoutParams(dp(64),dp(64),Gravity.TOP|Gravity.START);corner.setMargins(dp(18),dp(12),0,0);root.addView(menuButton,corner);
        clockFace=column(24);clockFace.setGravity(Gravity.TOP|Gravity.START);clockTime=text("",88,Color.rgb(125,125,125));clockTime.setTypeface(Typeface.create("sans-serif-light",Typeface.NORMAL));clockTime.setMaxLines(1);clockTime.setAutoSizeTextTypeUniformWithConfiguration(58,88,2,android.util.TypedValue.COMPLEX_UNIT_SP);clockDate=text("",22,Color.rgb(112,112,112));clockCount=text("0",46,Color.rgb(138,138,138));clockCount.setTypeface(Typeface.create("sans-serif-light",Typeface.NORMAL));clockFace.addView(clockTime,new LinearLayout.LayoutParams(-1,dp(118)));clockFace.addView(clockDate);gap(clockFace,10);clockFace.addView(clockCount);clockFace.setVisibility(stealth()?View.VISIBLE:View.GONE);FrameLayout.LayoutParams clockPosition=new FrameLayout.LayoutParams(-1,-2,Gravity.TOP|Gravity.START);clockPosition.topMargin=dp(76);root.addView(clockFace,clockPosition);menuButton.bringToFront();clockFace.setOnClickListener(v->add());
        WindowManager.LayoutParams attributes=getWindow().getAttributes();attributes.screenBrightness=stealth()?0.08f:-1f;getWindow().setAttributes(attributes);
        if(stealth()){getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);menuButton.setTextColor(Color.rgb(200,200,200));menuButton.setBackground(surface(Color.rgb(24,24,24),14));}
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        render();
    }
    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private LinearLayout column(int padding){LinearLayout view=new LinearLayout(this);view.setOrientation(LinearLayout.VERTICAL);view.setPadding(dp(padding),dp(padding),dp(padding),dp(padding));return view;}
    private LinearLayout row(){LinearLayout view=new LinearLayout(this);view.setOrientation(LinearLayout.HORIZONTAL);view.setGravity(Gravity.CENTER_VERTICAL);return view;}
    private void gap(LinearLayout parent,int height){parent.addView(new View(this),new LinearLayout.LayoutParams(1,dp(height)));}
    private GradientDrawable surface(int color,int radius){GradientDrawable shape=new GradientDrawable();shape.setColor(color);shape.setCornerRadius(dp(radius));shape.setStroke(dp(1),Color.argb(16,255,255,255));return shape;}
    private LinearLayout card(LinearLayout parent){LinearLayout view=column(20);view.setBackground(surface(cardColor,24));parent.addView(view,new LinearLayout.LayoutParams(-1,-2));return view;}
    private TextView text(String value,int size,int color){TextView view=new TextView(this);view.setText(t(value));view.setTextSize(size);view.setTextColor(color);view.setPadding(0,dp(6),0,dp(6));return view;}
    private TextView center(String value,int size,int color){TextView view=text(value,size,color);view.setGravity(Gravity.CENTER);return view;}
    private Button button(String value,Runnable click){Button view=new Button(this);view.setText(t(value));view.setTextSize(16);view.setTextColor(mint);view.setAllCaps(false);view.setMinWidth(0);view.setMinimumWidth(0);view.setMinHeight(dp(40));view.setMinimumHeight(dp(40));view.setPadding(dp(12),dp(4),dp(12),dp(4));view.setBackground(surface(cardColor,12));view.setOnClickListener(v->click.run());return view;}
    private ProgressBar progress(int color){ProgressBar bar=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);bar.setProgressTintList(ColorStateList.valueOf(color));bar.setProgressBackgroundTintList(ColorStateList.valueOf(Color.rgb(37,55,57)));return bar;}
    private int selected(){return store.selectedIndex();}
    private int goal(){return Math.max(1,store.number("goal",33));}
    private String number(int n){return String.format(Locale.forLanguageTag("ru"),"%,d",n);}
    private void render(){if(tasbih==null)return;if(clockTime!=null&&stealth()){java.time.LocalDateTime now=java.time.LocalDateTime.now();Locale locale=Locale.forLanguageTag(english()?"en":"ru");clockTime.setText(now.format(DateTimeFormatter.ofPattern("HH:mm",locale)));clockDate.setText(now.format(DateTimeFormatter.ofPattern("EEEE, d MMMM",locale)));clockFace.setTranslationX(dp((now.getMinute()%3-1)*4));clockFace.setTranslationY(dp((now.getMinute()/3%3-1)*4));}int selected=selected();int count=store.countFor(selected);int current=count==0?0:(count-1)%goal()+1;
        arabicText.setText(z(selected,"arabic"));nameText.setText(z(selected,"name"));meaningText.setText(z(selected,"meaning"));int visibility=store.enabled("showText",true)?View.VISIBLE:View.INVISIBLE;arabicText.setVisibility(visibility);nameText.setVisibility(visibility);meaningText.setVisibility(visibility);tasbih.progress(current,goal());if(clockCount!=null)clockCount.setText(String.valueOf(current));if(publicationView!=null)publicationView.bind(store,english());
    }
    private void add(){if(!tapGate.accept(SystemClock.elapsedRealtime(),store.number("tapInterval",200)))return;try{boolean complete=store.add(selected(),goal(),store.enabled("autoNext",false));feedback(complete);
        render();
    }catch(Exception e){toast("Нажатие не сохранено. Проверьте свободное место.");}}
    private void chooseGoal(){new AlertDialog.Builder(this).setTitle(t("Цель круга")).setItems(new String[]{"33","99","100","1000",t("Другое количество")},(dialog,index)->{if(index==4){customGoal();return;}store.put("goal",String.valueOf(new int[]{33,99,100,1000}[index]));render();}).show();}
    private void customGoal(){EditText input=new EditText(this);input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);input.setText(String.valueOf(goal()));LinearLayout box=column(24);box.addView(input);AlertDialog dialog=new AlertDialog.Builder(this).setTitle(t("Цель круга")).setView(box).setNegativeButton(t("Отмена"),null).setPositiveButton(t("Сохранить"),null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{int n=Integer.parseInt(input.getText().toString());if(n<1||n>100000)throw new NumberFormatException();store.put("goal",String.valueOf(n));render();dialog.dismiss();}catch(NumberFormatException e){input.setError(t("От 1 до 100 000"));}}));dialog.show();}
    private void customZikr(){LinearLayout box=column(20);EditText name=new EditText(this),arabic=new EditText(this),meaning=new EditText(this);name.setHint(t("Название"));arabic.setHint(t("Арабский текст (необязательно)"));meaning.setHint(t("Перевод (необязательно)"));name.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(80)});arabic.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(500)});meaning.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(500)});box.addView(name);box.addView(arabic);box.addView(meaning);ScrollView scroll=new ScrollView(this);scroll.addView(box);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle(t("Добавить свой зикр")).setView(scroll).setNegativeButton(t("Отмена"),null).setPositiveButton(t("Сохранить"),null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{store.createZikr(name.getText().toString(),arabic.getText().toString(),meaning.getText().toString());render();dialog.dismiss();openMenu("zikrs");}catch(Exception e){name.setError(t("Введите название. Лимит: 200 своих зикров."));}}));dialog.show();
    }
    private void reminderSettings(){
        String time=String.format(Locale.ROOT,"%02d:%02d",store.number("reminderHour",7),store.number("reminderMinute",0));
        new AlertDialog.Builder(this).setTitle(english()?"Daily reminder":"Ежедневное напоминание").setItems(new String[]{(english()?"Time: ":"Время: ")+time,store.enabled("dailyReminder",true)?(english()?"Turn off":"Выключить"):(english()?"Turn on":"Включить"),english()?"Notification permission":"Разрешение уведомлений"},(d,index)->{
            if(index==0)new TimePickerDialog(this,(view,h,m)->{store.put("reminderHour",String.valueOf(h));store.put("reminderMinute",String.valueOf(m));store.put("dailyReminder","true");Reminders.schedule(this);requestNotifications();},store.number("reminderHour",7),store.number("reminderMinute",0),true).show();
            else if(index==1){store.put("dailyReminder",String.valueOf(!store.enabled("dailyReminder",true)));Reminders.schedule(this);if(store.enabled("dailyReminder",true))requestNotifications();}
            else requestNotifications();
        }).show();
    }
    private void requestNotifications(){if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},701);else if(!getSystemService(NotificationManager.class).areNotificationsEnabled())startActivity(new android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName()));}
    private void soundSettings(){clickTone.refresh(this);java.util.List<String> keys=new java.util.ArrayList<>(java.util.Arrays.asList(ClickSound.KEYS));java.util.List<String> names=new java.util.ArrayList<>(java.util.Arrays.asList(english()?new String[]{"Wooden beads","Water drop","Raindrops","Pebbles","Soft tone"}:new String[]{"Деревянные чётки","Капля воды","Капли дождя","Камешки","Мягкий тон"}));org.json.JSONArray extra=Experience.sounds(store);for(int i=0;i<extra.length();i++){keys.add(extra.optJSONObject(i).optString("id"));names.add(extra.optJSONObject(i).optString("name"));}new AlertDialog.Builder(this).setTitle(english()?"Tap sound":"Звук счётчика").setSingleChoiceItems(names.toArray(new String[0]),Math.max(0,keys.indexOf(store.value("clickSound","beads"))),(d,index)->{store.put("clickSound",keys.get(index));clickTone.play(false,keys.get(index));}).setPositiveButton(english()?"Done":"Готово",null).show();}
    private void dailyDialog(){EditText input=new EditText(this);input.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);input.setText(String.valueOf(store.number("dailyGoal",900)));LinearLayout box=column(24);box.addView(input);AlertDialog dialog=new AlertDialog.Builder(this).setTitle(t("Ваша дневная цель")).setMessage(t("Комфортное для вас количество зикров")).setView(box).setNegativeButton(t("Отмена"),null).setPositiveButton(t("Сохранить"),null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{int value=Integer.parseInt(input.getText().toString());if(value<1||value>100000)throw new NumberFormatException();store.put("dailyGoal",String.valueOf(value));render();dialog.dismiss();}catch(NumberFormatException e){input.setError(t("От 1 до 100 000"));}}));dialog.show();}
    private void openMenu(){openMenu("home");}
    private void openMenu(String page){
        Dialog dialog=new Dialog(this,android.R.style.Theme_DeviceDefault_Dialog_NoActionBar);dialog.setCanceledOnTouchOutside(true);dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);populateMenu(dialog,page);dialog.show();styleMenuWindow(dialog);
    }
    private void styleMenuWindow(Dialog dialog){Window window=dialog.getWindow();if(window!=null){window.setBackgroundDrawableResource(android.R.color.transparent);window.setLayout(Math.min(dp(440),getResources().getDisplayMetrics().widthPixels-dp(52)),-1);window.setGravity(Gravity.TOP|Gravity.START);window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);window.setDimAmount(0.14f);window.setStatusBarColor(background);window.setNavigationBarColor(background);WindowManager.LayoutParams params=window.getAttributes();params.screenBrightness=-1f;window.setAttributes(params);window.getDecorView().setSystemUiVisibility("light".equals(store.value("theme","emerald"))?View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR:0);}}
    private TextView brand(){TextView title=text("✦ ZikriLLah",28,mint);title.setTypeface(Typeface.create("serif",Typeface.ITALIC));title.setLetterSpacing(0.015f);return title;}
    private void quickPreferences(LinearLayout menu,Dialog dialog){
        LinearLayout controls=row();
        String[] themes={"emerald","light","dark","black"},icons={"✦","☀","☾","●"};
        int current=0;for(int i=0;i<themes.length;i++)if(themes[i].equals(store.value("theme","emerald")))current=i;
        java.util.List<String> themeKeys=new java.util.ArrayList<>(java.util.Arrays.asList(themes));org.json.JSONArray extra=Experience.themes(store);for(int i=0;i<extra.length();i++)themeKeys.add(extra.optJSONObject(i).optString("id"));int currentKey=themeKeys.indexOf(store.value("theme","emerald"));final String nextTheme=themeKeys.get((currentKey+1)%themeKeys.size());
        Button language=button(english()?"ENG":"RU",()->{store.put("language",english()?"ru":"en");buildScreen();populateMenu(dialog,"home");});
        language.setContentDescription(t("Язык"));
        Button theme=button(icons[current],()->{store.put("theme",nextTheme);buildScreen();populateMenu(dialog,"home");});
        theme.setContentDescription(t("Тема"));
        Button hidden=button("🕶",()->{store.put("stealthMode",String.valueOf(!stealth()));dialog.dismiss();buildScreen();});
        hidden.setContentDescription(t("Скрытый режим · часы"));
        Button sound=button(feedbackIcon(),()->{cycleFeedback();populateMenu(dialog,"home");});sound.setContentDescription(feedbackLabel());
        Button[] buttons={hidden,language,theme,sound};LinearLayout line=row();
        for(int i=0;i<buttons.length;i++){buttons[i].setTextSize(14);buttons[i].setMinWidth(0);buttons[i].setPadding(0,0,0,0);LinearLayout.LayoutParams cell=new LinearLayout.LayoutParams(0,dp(48),1);if(i<3)cell.rightMargin=dp(4);line.addView(buttons[i],cell);}menu.addView(line);menu.addView(text(feedbackLabel(),12,muted));
    }
    private int feedbackMode(){return silent()?3:soundEnabled()?(vibrationEnabled()?0:1):vibrationEnabled()?2:3;}
    private String feedbackIcon(){return new String[]{"🔊📳","🔊","📳","🔇"}[feedbackMode()];}
    private String feedbackLabel(){return (english()?new String[]{"Sound + vibration","Sound only","Vibration only","Silent"}:new String[]{"Звук и вибрация","Только звук","Только вибрация","Без звука и вибрации"})[feedbackMode()];}
    private void cycleFeedback(){int mode=(feedbackMode()+1)%4;store.put("soundEnabled",String.valueOf(mode<2));store.put("vibrationEnabled",String.valueOf(mode==0||mode==2));store.put("silent",String.valueOf(mode==3));}

    private void section(LinearLayout menu,String title){gap(menu,14);menu.addView(text(title,14,mint));}
    private void toggle(LinearLayout menu,String title,String key,boolean fallback,Runnable changed){Switch item=new Switch(this);item.setText(title);item.setTextColor(white);item.setTextSize(15);item.setPadding(dp(12),dp(10),dp(12),dp(10));item.setMinHeight(dp(54));item.setChecked(store.enabled(key,fallback));item.setOnCheckedChangeListener((v,on)->{store.put(key,String.valueOf(on));if(changed!=null)changed.run();});menu.addView(item,new LinearLayout.LayoutParams(-1,-2));}
    private void statCard(LinearLayout parent,String label,int value){LinearLayout card=card(parent);card.addView(text(label,13,muted));card.addView(text(number(value),32,white));gap(parent,10);}
    private void populateMenu(Dialog dialog,String page){
        if(publicationView!=null){publicationView.release();publicationView=null;}dialog.setOnDismissListener(null);
        ScrollView scroll=new ScrollView(this);menuScroll=scroll;scroll.setOverScrollMode(View.OVER_SCROLL_NEVER);LinearLayout menu=column(12);menu.setBackgroundColor(Color.TRANSPARENT);scroll.setBackground(Experience.background(this,store,"menu",(background&0x00ffffff)|0xe6000000));scroll.setFillViewport(true);scroll.addView(menu);scroll.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});dialog.setContentView(scroll);
        LinearLayout heading=row();heading.addView(page.equals("home")?brand():text(t(page.equals("settings")?"Настройки":page.equals("stats")?"Статистика":"Зикры"),26,white),new LinearLayout.LayoutParams(0,-2,1));heading.addView(button("×",dialog::dismiss));menu.addView(heading);gap(menu,14);
        if(page.equals("home")){
            String[] titles={"⚙ "+t("Настройки"),"▥ "+t("Статистика"),"◉ "+t("Зикры"),(store.linked()?"✓ ":"↗ ")+"Telegram"};String[] pages={"settings","stats","zikrs"};
            for(int r=0;r<2;r++){LinearLayout line=row();for(int c=0;c<2;c++){final int index=r*2+c;Button item=button(titles[index],()->{if(index<3)populateMenu(dialog,pages[index]);else if(store.linked()){dialog.dismiss();manualSync();}else{dialog.dismiss();linkDialog();}});item.setTextSize(14);item.setPadding(dp(4),dp(4),dp(4),dp(4));item.setMinHeight(dp(52));LinearLayout.LayoutParams cell=new LinearLayout.LayoutParams(0,-2,1);if(c==0)cell.rightMargin=dp(8);line.addView(item,cell);}menu.addView(line);gap(menu,8);}
            quickPreferences(menu,dialog);
            menu.addView(button(english()?"↪ Exit":"↪ Выход",()->{dialog.dismiss();confirmExit();}));
            menu.addView(text(store.linked()?t("В очереди")+": "+store.queued():t("На устройстве"),12,muted));PublicationView card=new PublicationView(this,white,muted,cardColor);publicationView=card;menu.addView(card,new LinearLayout.LayoutParams(-1,-2));card.bind(store,english());dialog.setOnDismissListener(d->{card.release();if(publicationView==card)publicationView=null;});try{org.json.JSONArray feed=new org.json.JSONArray(store.value("broadcasts","[]"));for(int i=0;i<feed.length();i++){org.json.JSONObject item=feed.optJSONObject(i);menu.addView(text("📨 "+item.optString("text"),14,white));}if(feed.length()>0)menu.addView(button(english()?"Open broadcasts in Telegram":"Открыть рассылки в Telegram",()->openTelegramBot()));}catch(Exception ignored){}menu.addView(text("ZikriLLah · 0.14",11,muted));
        }else if(page.equals("stats")){
            PracticeStats stats=store.stats(selected(),goal());statCard(menu,english()?"☀ Today":"☀ Сегодня",stats.today);
            LinearLayout totals=card(menu);detail(totals,t("Всего"),number(stats.total));detail(totals,t("Вчера"),number(stats.yesterday));detail(totals,t("За этот месяц"),number(stats.month));
            section(menu,english()?"📊 Last 7 days":"📊 Последние 7 дней");menu.addView(new WeekChart(this,stats.week,mint,white),new LinearLayout.LayoutParams(-1,dp(190)));
            section(menu,english()?"📿 Selected dhikr":"📿 Выбранный зикр");detail(menu,z(selected(),"name"),number(stats.selected));detail(menu,t("Полных кругов"),number(stats.rounds()));
        }else if(page.equals("settings")){
            section(menu,english()?"🎧 Sound & vibration":"🎧 Звук и вибрация");
            menu.addView(button(feedbackIcon()+" "+feedbackLabel(),()->{cycleFeedback();populateMenu(dialog,"settings");}));
            menu.addView(button(english()?"♫ Choose sound":"♫ Выбрать звук",this::soundSettings));


            menu.addView(button(english()?"📳 Test vibration":"📳 Проверить вибрацию",()->new AlertDialog.Builder(this).setTitle(english()?"Vibration check":"Проверка вибрации").setMessage(haptics.diagnose(this,english())).setPositiveButton(english()?"Phone settings":"Настройки телефона",(d,w)->{try{startActivity(new android.content.Intent(android.provider.Settings.ACTION_SOUND_SETTINGS));}catch(Exception ignored){}}).setNegativeButton(english()?"Close":"Закрыть",null).show()));
            section(menu,english()?"📿 Practice":"📿 Счётчик");
            menu.addView(button((english()?"Repeats per round: ":"Повторений в круге: ")+goal(),()->{dialog.dismiss();chooseGoal();}));gap(menu,8);
            menu.addView(button("⏱ "+t("Интервал нажатий")+": "+store.number("tapInterval",200)+" "+t("мс"),()->new AlertDialog.Builder(this).setTitle(t("Интервал нажатий")).setItems(new String[]{"100 ms","200 ms","350 ms","500 ms"},(d,n)->{store.put("tapInterval",String.valueOf(new int[]{100,200,350,500}[n]));populateMenu(dialog,"settings");}).show()));
            toggle(menu,english()?"📖 Dhikr text":"📖 Текст зикра","showText",true,this::render);
            toggle(menu,english()?"↪ Next dhikr after round":"↪ Следующий зикр после круга","autoNext",false,null);
            section(menu,english()?"🕶 Discreet mode":"🕶 Скрытый режим");
            menu.addView(button(t("Скрытый режим · часы"),()->{store.put("stealthMode",String.valueOf(!stealth()));dialog.dismiss();buildScreen();}));
            menu.addView(text(english()?"No tap sounds or vibrations. Only round-end vibration. Silent mode disables that too.":"Без звука и вибрации нажатий. Вибрация только в конце круга. «Полная тишина» отключает и её.",12,muted));
            section(menu,english()?"🔔 Notifications":"🔔 Уведомления");
            toggle(menu,english()?"Daily reminder":"Ежедневное напоминание","dailyReminder",true,()->{Reminders.schedule(this);if(store.enabled("dailyReminder",true))requestNotifications();});
            menu.addView(button("🕖 "+String.format(Locale.ROOT,"%02d:%02d",store.number("reminderHour",7),store.number("reminderMinute",0)),this::reminderSettings));
            toggle(menu,english()?"Admin announcements":"Объявления администратора","adminNotifications",true,null);
            section(menu,english()?"☁ Saved progress":"☁ Сохранение");menu.addView(text(store.value("base",ServerConfig.DEFAULT_URL)+"\nTelegram ID: "+store.value("account","—")+"\n"+store.value("lastSync",""),12,muted));
            menu.addView(button(english()?"🌐 Server address":"🌐 Адрес сервера",this::serverAddressDialog));
            menu.addView(text(english()?"Counts are saved offline. Sync on confirmed exit, once daily when online, and manually using Telegram.":"Нажатия сохраняются офлайн. Обмен при подтверждённом выходе, автоматически при доступной сети раз в день и вручную кнопкой Telegram.",12,muted));
        }else if(page.equals("zikrs")){
            menu.addView(new ZikrListView(this,store,english(),white,mint,cardColor,()->{int y=menuScroll.getScrollY();render();populateMenu(dialog,"zikrs");menuScroll.post(()->menuScroll.scrollTo(0,y));}));
            menu.addView(button("＋ "+t("Добавить свой зикр"),()->{dialog.dismiss();customZikr();}));
        }
        if(!page.equals("home")){gap(menu,24);menu.addView(button("← "+t("Назад"),()->populateMenu(dialog,"home")));}
        styleMenuWindow(dialog);
    }
    private void detail(LinearLayout menu,String label,String value){LinearLayout line=row();line.addView(text(label,12,muted),new LinearLayout.LayoutParams(0,-2,1));line.addView(text(value,12,white));menu.addView(line);}
    private void showWelcome(){new AlertDialog.Builder(this).setTitle(english()?"Welcome to ZikriLLah":"Добро пожаловать в ZikriLLah").setMessage(english()?"Connect Telegram to sync progress across devices, or skip and count offline.":"Подключите Telegram для синхронизации прогресса. Можно пропустить и считать офлайн.").setPositiveButton(english()?"Connect Telegram":"Войти через Telegram",(d,w)->{store.put("onboarded","true");linkDialog();}).setNegativeButton(english()?"Skip":"Пропустить",(d,w)->store.put("onboarded","true")).setOnCancelListener(d->store.put("onboarded","true")).show();}
    private void openTelegramBot(){String name=store.value("botUsername","");if(name.matches("[A-Za-z0-9_]{5,32}"))try{startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,android.net.Uri.parse("https://t.me/"+name)));}catch(Exception ignored){}}
    private void serverAddressDialog(){EditText input=new EditText(this);input.setSingleLine(true);input.setText(store.value("base",ServerConfig.DEFAULT_URL));AlertDialog dialog=new AlertDialog.Builder(this).setTitle(english()?"HTTPS server":"HTTPS-сервер").setView(input).setPositiveButton(english()?"Save":"Сохранить",null).setNegativeButton(t("Позже"),null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{String value=input.getText().toString().trim().replaceAll("/+$","");try{java.net.URI uri=java.net.URI.create(value);if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||!uri.getPath().isEmpty())throw new IllegalArgumentException();store.put("base",value);store.put("linkId","");dialog.dismiss();}catch(Exception e){input.setError("https://example.org");}}));dialog.show();}
    private void manualSync(){toast(english()?"Syncing…":"Синхронизация…");SyncEngine.start(this,true,retry->runOnUiThread(()->{if(!isDestroyed()){buildScreen();toast(SyncEngine.status);if(SyncEngine.needsLogin){store.put("token","");linkDialog();}}}));}
    private boolean pollingLink;
    private void linkDialog(){beginTelegramLink();}
    private void legacyLinkDialog(){
      new AlertDialog.Builder(this).setTitle("Telegram").setMessage(english()?"Open the bot, press Start, then return here. Only use a link you requested yourself.":"Откройте бота, нажмите Старт и вернитесь в приложение. Используйте только ссылку, которую запросили сами.").setPositiveButton(english()?"Open Telegram":"Открыть Telegram",(d,w)->beginTelegramLink()).setNeutralButton(english()?"Server / code":"Сервер / код",(d,w)->codeLinkDialog()).setNegativeButton(t("Позже"),null).show();
    }
    private void beginTelegramLink(){if(linking)return;linking=true;String base=store.value("base",ServerConfig.DEFAULT_URL);
      new Thread(()->{try{JSONObject result=SyncEngine.request(base,"/api/auth/device",new JSONObject(),"");store.put("linkId",result.getString("id"));store.put("linkSecret",result.getString("secret"));store.put("linkBase",base);store.put("linkExpires",String.valueOf(System.currentTimeMillis()+600000));runOnUiThread(()->{linking=false;if(!isDestroyed())startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,android.net.Uri.parse(result.optString("url"))));});}catch(Exception e){runOnUiThread(()->{linking=false;if(!isDestroyed()){toast(english()?"Server unavailable. Check address.":"Сервер недоступен. Проверьте адрес.");serverAddressDialog();}});}},"telegram-connect").start();
    }
    private void pollTelegramLink(){try{if(Long.parseLong(store.value("linkExpires","0"))<System.currentTimeMillis()){store.put("linkId","");store.put("linkSecret","");return;}}catch(NumberFormatException e){return;}if(pollingLink||store.linked()||store.value("linkId","").isEmpty())return;pollingLink=true;
      new Thread(()->{try{String base=store.value("linkBase",ServerConfig.DEFAULT_URL);JSONObject result=SyncEngine.request(base,"/api/auth/poll",new JSONObject().put("id",store.value("linkId","")).put("secret",store.value("linkSecret","")),"");if(result.has("token")){String account=result.optString("account","");if(!store.value("account","").isEmpty()&&!account.isEmpty()&&!store.value("account","").equals(account)){store.put("linkId","");runOnUiThread(()->toast("Это другой Telegram-аккаунт. Подключите прежний аккаунт, чтобы не смешать историю."));return;}store.bind(base,result.getString("token"));store.put("linkId","");store.put("linkSecret","");runOnUiThread(()->{if(!isDestroyed())manualSync();});}}catch(Exception ignored){}finally{runOnUiThread(()->{pollingLink=false;if(!isDestroyed()&&ZikrApplication.foreground&&!store.linked()&&!store.value("linkId","").isEmpty())handler.postDelayed(this::pollTelegramLink,4000);});}},"telegram-confirm").start();
    }
    private void codeLinkDialog(){
        LinearLayout form=column(24);EditText url=new EditText(this);url.setHint(t("https://адрес-сервера"));url.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);url.setText(store.value("base",ServerConfig.DEFAULT_URL));form.addView(url);EditText code=new EditText(this);code.setSingleLine(true);code.setHint(t("Одноразовый код /link из бота"));form.addView(code);TextView message=text("",12,muted);form.addView(message);
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle(t("Подключить Telegram")).setMessage(t("Введите адрес сервера и код из бота один раз. Дальше прогресс объединяется автоматически.")).setView(form).setNegativeButton(t("Позже"),null).setPositiveButton(t("Подключить"),null).create();
        dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{if(linking||store.linked())return;String endpoint=url.getText().toString().trim().replaceAll("/+$","");String value=code.getText().toString().trim();if(!value.matches("[a-f0-9]{24}")){code.setError(t("Введите код, полученный по /link"));return;}linking=true;dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);message.setText(t("Подключаем…"));
            new Thread(()->{try{JSONObject result=SyncEngine.request(endpoint,"/api/link",new JSONObject().put("code",value),"");store.bind(endpoint,result.getString("token"));store.requestSync();runOnUiThread(()->{linking=false;if(!isDestroyed()){dialog.dismiss();render();}});}catch(Exception e){runOnUiThread(()->{linking=false;if(!isDestroyed()){dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(true);message.setText(t("Не удалось подключиться. Проверьте HTTPS-адрес и получите новый /link в боте."));}});}},"zikr-link").start();}));dialog.show();
    }
    private void toast(String value){Toast.makeText(this,t(value),Toast.LENGTH_LONG).show();}
    @Override public boolean dispatchTouchEvent(MotionEvent event){
        int action=event.getActionMasked();
        if(action==MotionEvent.ACTION_DOWN){
            Rect bounds=new Rect();
            if(menuButton!=null){int[] location=new int[2];menuButton.getLocationOnScreen(location);bounds.set(location[0]-dp(12),location[1]-dp(12),location[0]+menuButton.getWidth()+dp(12),location[1]+menuButton.getHeight()+dp(12));}
            routeToMenu=bounds.contains((int)event.getRawX(),(int)event.getRawY());
            tapGesture.down(event.getRawX(),event.getRawY(),event.getEventTime(),false);
        }
        int slop=routeToMenu?dp(24):ViewConfiguration.get(this).getScaledTouchSlop();
        if(action==MotionEvent.ACTION_MOVE)tapGesture.move(event.getRawX(),event.getRawY(),slop);
        if(action==MotionEvent.ACTION_POINTER_DOWN||action==MotionEvent.ACTION_CANCEL)tapGesture.cancel();
        if(action==MotionEvent.ACTION_UP){boolean menuTap=routeToMenu;boolean accepted=tapGesture.up(event.getRawX(),event.getRawY(),event.getEventTime(),slop);routeToMenu=false;if(accepted){if(menuTap)menuButton.performClick();else if(store!=null)add();}}
        return true;
    }
    @Override protected void onResume(){super.onResume();ZikrApplication.foreground=true;pollTelegramLink();SyncJobs.schedule(this,true);if(!store.enabled("notificationAsked",false)){store.put("notificationAsked","true");handler.postDelayed(this::requestNotifications,800);}handler.removeCallbacks(ticker);handler.post(ticker);}
    private boolean exitPending;
    @Override public void onBackPressed(){confirmExit();}
    private void confirmExit(){if(exitPending)return;new AlertDialog.Builder(this).setTitle(english()?"Exit ZikriLLah?":"Выйти из ZikriLLah?").setMessage(english()?"If online, progress and content will sync before closing.":"При доступной сети сначала обновим прогресс и содержимое. Офлайн-прогресс сохранится на телефоне.").setNegativeButton(english()?"Stay":"Остаться",null).setPositiveButton(english()?"Exit":"Выйти",(d,w)->{if(!store.linked()||!SyncEngine.online(this)){finish();return;}exitPending=true;toast(english()?"Syncing before exit…":"Синхронизация перед выходом…");SyncEngine.start(this,true,retry->runOnUiThread(()->{exitPending=false;if(!isDestroyed()){if(retry){new AlertDialog.Builder(this).setMessage(SyncEngine.status+". "+(english()?"Exit anyway?":"Всё равно выйти?")).setNegativeButton(english()?"Stay":"Остаться",null).setPositiveButton(english()?"Exit":"Выйти",(x,y)->finish()).show();}else finish();}}));}).show();}
    @Override protected void onStop(){super.onStop();if(haptics!=null)haptics.cancel();handler.removeCallbacks(ticker);ZikrApplication.foreground=false;store.requestSync();SyncJobs.schedule(this,true);}
    @Override protected void onDestroy(){handler.removeCallbacksAndMessages(null);if(clickTone!=null){clickTone.release();clickTone=null;}super.onDestroy();}
}
