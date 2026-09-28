package app.zikrillah;
import android.content.Context;
import android.graphics.Color;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;

/** Cached text plus media from the app server; no scripts, file access or arbitrary navigation. */
public final class PublicationView extends LinearLayout {
    private final int foreground,muted;private String signature="";private WebView media;
    public PublicationView(Context c,int foreground,int muted,int background){super(c);this.foreground=foreground;this.muted=muted;setOrientation(VERTICAL);setPadding(24,24,24,24);setBackgroundColor(background);}
    private TextView label(String text,int size,int color){TextView view=new TextView(getContext());view.setText(text);view.setTextSize(size);view.setTextColor(color);view.setPadding(0,8,0,8);return view;}
    public void bind(ZikrStore store,boolean english){String raw=store.value("publication","null"),base=store.value("base","");String key=raw+base+english;if(key.equals(signature))return;signature=key;release();removeAllViews();addView(label(english?"News & announcements":"Новости и объявления",15,foreground));
        if(raw.equals("null")){addView(label(english?"Updates will appear here after connecting to the server.":"Здесь появятся новости и объявления после подключения к серверу.",12,muted));return;}
        try{JSONObject post=new JSONObject(raw);String path=post.optString("media","");
            if(base.startsWith("https://")&&path.matches("/media/[a-f0-9-]{36}\\.(jpg|png|gif|webp|mp4)")){
                media=new WebView(getContext());media.setBackgroundColor(Color.TRANSPARENT);media.getSettings().setJavaScriptEnabled(false);media.getSettings().setAllowFileAccess(false);media.getSettings().setAllowContentAccess(false);media.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);media.getSettings().setMediaPlaybackRequiresUserGesture(true);media.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return true;}});
                String source=android.text.TextUtils.htmlEncode(base+path),tag=path.endsWith(".mp4")?"<video controls playsinline preload='none' style='width:100%;height:190px' src='"+source+"'></video>":"<img alt='' style='width:100%;height:190px;object-fit:contain' src='"+source+"'>";
                media.loadDataWithBaseURL(base,"<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='margin:0;background:transparent'>"+tag+"</body></html>","text/html","UTF-8",null);addView(media,new LinearLayout.LayoutParams(-1,(int)(200*getResources().getDisplayMetrics().density)));
            }
            addView(label(post.optString("text"),13,foreground));
            JSONObject button=post.optJSONObject("button");if(button!=null){String title=button.optString("text","").trim(),url=button.optString("url","");try{java.net.URI uri=java.net.URI.create(url);if(!title.isEmpty()&&title.length()<=64&&url.length()<=2048&&"https".equalsIgnoreCase(uri.getScheme())&&uri.getHost()!=null&&uri.getUserInfo()==null){Button link=new Button(getContext());link.setAllCaps(false);link.setText(title);link.setOnClickListener(v->{try{getContext().startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW,android.net.Uri.parse(url)));}catch(android.content.ActivityNotFoundException e){Toast.makeText(getContext(),english?"No browser available":"Не найден браузер",Toast.LENGTH_SHORT).show();}});addView(link,new LinearLayout.LayoutParams(-1,-2));}}catch(IllegalArgumentException ignored){}}

        }catch(Exception e){addView(label(english?"Publication unavailable":"Публикация недоступна",12,muted));}
    }
    public void release(){if(media!=null){removeView(media);media.stopLoading();media.destroy();media=null;}}
}
