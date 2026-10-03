package app.zikrillah;
import android.app.job.*;
import android.content.*;
public final class SyncJobs {
 private static final int QUEUE=2002;
 public static void schedule(Context context,boolean immediate){
  JobScheduler jobs=context.getSystemService(JobScheduler.class);jobs.cancel(2001);
  ZikrStore store=ZikrStore.get(context);if(!store.linked())return;
  long latency=Math.max(5000,store.nextSync()-System.currentTimeMillis());
  jobs.schedule(new JobInfo.Builder(QUEUE,new ComponentName(context,SyncJobService.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPersisted(true).setMinimumLatency(latency).setBackoffCriteria(15*60*1000,JobInfo.BACKOFF_POLICY_EXPONENTIAL).build());
 }
}
