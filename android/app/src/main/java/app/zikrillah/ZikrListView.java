package app.zikrillah;
import android.app.AlertDialog;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.util.*;

public final class ZikrListView extends LinearLayout {
 private final ZikrStore store;private final boolean english;private final int ink,accent,card;
 private final LinearLayout chosen,others;private final Runnable changed;private boolean dropped;
 public ZikrListView(Context context,ZikrStore store,boolean english,int ink,int accent,int card,Runnable changed){
  super(context);this.store=store;this.english=english;this.ink=ink;this.accent=accent;this.card=card;this.changed=changed;setOrientation(VERTICAL);
  addView(label(english?"Hold a dhikr and drag. Above the line: in cycle.":"Удерживайте зикр и перетаскивайте. Выше черты — в цикле."));
  addView(label(english?"In cycle · top to bottom":"В цикле · сверху вниз"));chosen=group();addView(chosen);
  View divider=new View(context);divider.setBackgroundColor(accent);addView(divider,new LayoutParams(-1,dp(2)));
  addView(label(english?"Others · drag above to include":"Остальные · перенесите выше для добавления"));others=group();addView(others);
  JSONArray catalog=store.catalog();List<String> selected=store.cycle();
  for(int i=0;i<catalog.length();i++){JSONObject z=catalog.optJSONObject(i);String id=z.optString("id"),name=z.optString(english?"englishName":"name",z.optString("name"));LinearLayout row=new LinearLayout(context);row.setGravity(Gravity.CENTER_VERTICAL);row.setTag(id);row.setPadding(0,dp(3),0,dp(3));
   Button title=new Button(context);title.setAllCaps(false);title.setText("⠿  "+name);title.setTextColor(ink);title.setTextSize(15);title.setMinWidth(0);title.setMinimumWidth(0);title.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);title.setPadding(dp(10),dp(10),dp(8),dp(10));GradientDrawable bg=new GradientDrawable();bg.setColor(card);bg.setCornerRadius(dp(12));title.setBackground(bg);row.addView(title,new LayoutParams(0,-2,1));
   title.setOnClickListener(v->{store.put("selectedId",id);changed.run();});
   OnLongClickListener drag=v->{dropped=false;row.setAlpha(.5f);boolean started=row.startDragAndDrop(ClipData.newPlainText("dhikr",id),new View.DragShadowBuilder(row),row,0);if(!started)row.setAlpha(1);return started;};
   title.setOnLongClickListener(drag);row.setOnLongClickListener(drag);
   if(id.startsWith("custom-")){Button remove=new Button(context);remove.setText("🗑");remove.setTextColor(accent);remove.setMinWidth(0);remove.setMinimumWidth(0);remove.setPadding(0,0,0,0);remove.setContentDescription((english?"Delete: ":"Удалить: ")+name);row.addView(remove,new LayoutParams(dp(42),dp(48)));remove.setOnClickListener(v->new AlertDialog.Builder(context).setTitle(english?"Delete dhikr?":"Удалить зикр?").setMessage(name+"\n"+(english?"Count history will be kept.":"История счёта сохранится.")).setNegativeButton(english?"Cancel":"Отмена",null).setPositiveButton(english?"Delete":"Удалить",(d,w)->{store.deleteZikr(id);store.requestSync();changed.run();}).show());}
   (selected.contains(id)?chosen:others).addView(row,new LayoutParams(-1,-2));
  }
 }
 private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}
 private TextView label(String text){TextView v=new TextView(getContext());v.setText(text);v.setTextColor(accent);v.setTextSize(12);v.setPadding(0,dp(12),0,dp(12));return v;}
 private List<String> ids(LinearLayout group){List<String> ids=new ArrayList<>();for(int i=0;i<group.getChildCount();i++)if(group.getChildAt(i).getTag() instanceof String)ids.add((String)group.getChildAt(i).getTag());return ids;}
 private LinearLayout group(){
  LinearLayout group=new LinearLayout(getContext());group.setOrientation(VERTICAL);group.setMinimumHeight(dp(80));group.setPadding(0,dp(8),0,dp(8));
  View marker=new View(getContext());marker.setBackgroundColor(accent);
  group.setOnDragListener((v,event)->{
   if(!(event.getLocalState() instanceof View))return false;
   View moving=(View)event.getLocalState();
   switch(event.getAction()){
    case DragEvent.ACTION_DRAG_STARTED:return true;
    case DragEvent.ACTION_DRAG_LOCATION:
     int index=0;for(int i=0;i<group.getChildCount();i++){View child=group.getChildAt(i);if(child==marker)continue;if(event.getY()>child.getTop()+child.getHeight()/2f)index=i+1;}
     if(marker.getParent()==group)group.removeView(marker);group.addView(marker,Math.min(index,group.getChildCount()),new LayoutParams(-1,dp(3)));
     ViewParent parent=getParent();while(parent!=null&&!(parent instanceof ScrollView))parent=parent.getParent();
     if(parent instanceof ScrollView){ScrollView scroll=(ScrollView)parent;int[] a=new int[2],b=new int[2];group.getLocationOnScreen(a);scroll.getLocationOnScreen(b);float y=a[1]+event.getY()-b[1];if(y<dp(80))scroll.smoothScrollBy(0,-dp(24));else if(y>scroll.getHeight()-dp(80))scroll.smoothScrollBy(0,dp(24));}return true;
    case DragEvent.ACTION_DRAG_EXITED:group.removeView(marker);return true;
    case DragEvent.ACTION_DROP:
     LinearLayout original=(LinearLayout)moving.getParent();
     if(original==chosen&&group==others&&ids(chosen).size()==1){Toast.makeText(getContext(),english?"Keep at least one dhikr in the cycle":"Оставьте хотя бы один зикр в цикле",Toast.LENGTH_SHORT).show();group.removeView(marker);return false;}
     int target=group.indexOfChild(marker);if(target<0)target=group.getChildCount();int old=original.indexOfChild(moving);if(original==group&&old<target)target--;
     group.removeView(marker);original.removeView(moving);group.addView(moving,Math.min(target,group.getChildCount()));moving.setAlpha(1);dropped=true;
     List<String> order=ids(chosen);List<String> selected=new ArrayList<>(order);order.addAll(ids(others));store.applyCycle(order,selected);post(changed);return true;
    case DragEvent.ACTION_DRAG_ENDED:group.removeView(marker);moving.setAlpha(1);return true;
    default:return true;
   }
  });return group;
 }
}
