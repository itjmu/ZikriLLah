package app.zikrillah;
import android.app.Application;
import android.net.*;

public final class ZikrApplication extends Application {
    public static volatile boolean foreground;
    @Override public void onCreate(){super.onCreate();
        ZikrStore.get(this);Reminders.schedule(this);SyncJobs.schedule(this,true);
        ConnectivityManager networks=getSystemService(ConnectivityManager.class);
        networks.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback(){
            private boolean validated;
            @Override public void onCapabilitiesChanged(Network network,NetworkCapabilities capabilities){
                boolean available=capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
                if(available&&!validated){SyncJobs.schedule(ZikrApplication.this,true);}validated=available;
            }
            @Override public void onLost(Network network){validated=false;}
        });
    }
}
