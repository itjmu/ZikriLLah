package app.zikrillah;
import android.content.Context;
import android.graphics.*;
import android.view.View;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
public final class WeekChart extends View {
 private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);private final int[] values;private final int accent,text;
 public WeekChart(Context context,int[] values,int accent,int text){super(context);this.values=values.clone();this.accent=accent;this.text=text;StringBuilder description=new StringBuilder();for(int i=0;i<7;i++)description.append(LocalDate.now().minusDays(6-i)).append(": ").append(values[i]).append(". ");setContentDescription(description.toString());}
 @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);float d=getResources().getDisplayMetrics().density,w=getWidth()/7f,baseline=getHeight()-30*d,max=1;for(int value:values)max=Math.max(max,value);paint.setTextAlign(Paint.Align.CENTER);paint.setTextSize(11*d);
  for(int i=0;i<7;i++){float x=w*(i+.5f),height=(baseline-32*d)*values[i]/max;paint.setColor(accent);paint.setAlpha(values[i]==0?50:230);canvas.drawRoundRect(x-w*.24f,baseline-Math.max(3*d,height),x+w*.24f,baseline,5*d,5*d,paint);paint.setAlpha(255);paint.setColor(text);canvas.drawText(String.valueOf(values[i]),x,baseline-Math.max(3*d,height)-8*d,paint);canvas.drawText(LocalDate.now().minusDays(6-i).format(DateTimeFormatter.ofPattern("dd.MM")),x,getHeight()-8*d,paint);}
 }
}
