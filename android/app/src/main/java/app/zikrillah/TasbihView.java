package app.zikrillah;
import android.content.Context;
import android.graphics.*;
import android.view.*;

/** Native vector beads: no image download, usable on the very first offline launch. */
public final class TasbihView extends View {
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    private int count,goal=33;
    private int accent=Color.rgb(149,226,192),muted=Color.rgb(145,166,165),foreground=Color.WHITE,surface=Color.rgb(18,34,38);
    private boolean english;
    public void appearance(int accent,int muted,int foreground,int surface,boolean english){this.accent=accent;this.muted=muted;this.foreground=foreground;this.surface=surface;this.english=english;invalidate();}
    public TasbihView(Context context){super(context);setClickable(true);setFocusable(true);setContentDescription("Добавить один зикр");}
    public void progress(int count,int goal){this.count=count;this.goal=goal;setContentDescription((english?"Add one dhikr. ":"Добавить один зикр. ")+count+(english?" of ":" из ")+goal);invalidate();}
    @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);float size=Math.min(Math.min(getWidth(),getHeight()),390*getResources().getDisplayMetrics().density),cx=getWidth()/2f,cy=getHeight()/2f,unit=size/300f;
        cy+=Math.min(12*getResources().getDisplayMetrics().density,Math.max(0,(getHeight()-size)/2));float radius=132*unit;
        for(int i=0;i<33;i++){double angle=-Math.PI/2+i*Math.PI*2/33;paint.setColor(i<Math.ceil(33f*count/goal)?accent:muted);paint.setAlpha(i<Math.ceil(33f*count/goal)?255:70);canvas.drawCircle(cx+(float)Math.cos(angle)*radius,cy+(float)Math.sin(angle)*radius,7.2f*unit,paint);}paint.setAlpha(255);
        paint.setColor(surface);canvas.drawCircle(cx,cy,89*unit,paint);
        paint.setColor(muted);paint.setAlpha(80);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(unit);canvas.drawCircle(cx,cy,89*unit,paint);paint.setStyle(Paint.Style.FILL);paint.setAlpha(255);
        paint.setTextAlign(Paint.Align.CENTER);paint.setTypeface(Typeface.create("sans-serif-light",Typeface.NORMAL));paint.setTextSize((count>999?48:66)*unit);paint.setColor(foreground);canvas.drawText(String.valueOf(count),cx,cy+5*unit,paint);
        paint.setTextSize(12*unit);paint.setColor(muted);canvas.drawText((english?"of ":"из ")+goal+(english?" in round":" в круге"),cx,cy+30*unit,paint);
        paint.setTextSize(8*unit);paint.setColor(accent);canvas.drawText(english?"TAP TO COUNT":"КОСНИТЕСЬ ЭКРАНА",cx,cy+60*unit,paint);
    }
    @Override public boolean performClick(){super.performClick();return true;}
}
