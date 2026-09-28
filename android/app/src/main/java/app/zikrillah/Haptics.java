package app.zikrillah;
import android.content.Context;
import android.media.AudioAttributes;
import android.os.*;

/** A distinct round-end signal; short taps cannot cut it off. */
public final class Haptics {
    private final Vibrator vibrator;private long holdUntil;
    public Haptics(Context context){vibrator=Build.VERSION.SDK_INT>=31?((VibratorManager)context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE)).getDefaultVibrator():(Vibrator)context.getSystemService(Context.VIBRATOR_SERVICE);}
    public boolean pulse(boolean complete){
        if(vibrator==null||!vibrator.hasVibrator())return false;
        if(!complete&&SystemClock.elapsedRealtime()<holdUntil)return true;
        try{int amplitude=vibrator.hasAmplitudeControl()?255:VibrationEffect.DEFAULT_AMPLITUDE;
            VibrationEffect effect=VibrationEffect.createOneShot(complete?320:75,amplitude);
            if(Build.VERSION.SDK_INT>=33)vibrator.vibrate(effect,new VibrationAttributes.Builder().setUsage(VibrationAttributes.USAGE_TOUCH).build());
            else vibrator.vibrate(effect,new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            if(complete)holdUntil=SystemClock.elapsedRealtime()+320;return true;
        }catch(RuntimeException e){return false;}
    }
    public String diagnose(Context context,boolean english){
        if(vibrator==null||!vibrator.hasVibrator())return english?"Android reports no vibration motor.":"Android сообщает: вибромотор недоступен.";
        int touch=android.provider.Settings.System.getInt(context.getContentResolver(),android.provider.Settings.System.HAPTIC_FEEDBACK_ENABLED,1);
        boolean sent=pulse(true);
        return (english?"Vibration motor detected. ":"Вибромотор обнаружен. ")+(touch==0?(english?"Touch vibration is disabled in system settings. ":"Вибрация касаний отключена в системных настройках. "):"")+(sent?(english?"A 320 ms signal was requested. If you feel nothing, check vibration intensity and Do Not Disturb in phone settings. Android cannot confirm physical vibration.":"Запрошен сигнал 320 мс. Если его не ощущаете, проверьте интенсивность вибрации и режим «Не беспокоить» в настройках телефона. Android не подтверждает фактическую вибрацию."):(english?"Android could not start vibration.":"Android не смог запустить вибрацию."));
    }
    public void cancel(){if(vibrator!=null)try{vibrator.cancel();}catch(RuntimeException ignored){}holdUntil=0;}
}
