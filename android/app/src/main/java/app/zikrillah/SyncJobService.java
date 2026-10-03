package app.zikrillah;
import android.app.job.*;
import android.os.*;
import java.util.*;

public final class SyncJobService extends JobService {
    private final Handler main=new Handler(Looper.getMainLooper());
    private final Set<JobParameters> active=Collections.newSetFromMap(new IdentityHashMap<>());
    @Override public boolean onStartJob(JobParameters parameters){
        active.add(parameters);
        SyncEngine.start(this,retry->main.post(()->{if(active.remove(parameters)){jobFinished(parameters,false);SyncJobs.schedule(this,true);}}));return true;
    }
    // A stopped request can safely finish: SQLite acknowledgements are idempotent.
    @Override public boolean onStopJob(JobParameters parameters){active.remove(parameters);return true;}
    @Override public void onDestroy(){active.clear();super.onDestroy();}
}
