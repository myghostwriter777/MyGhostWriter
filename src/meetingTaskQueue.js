// A session owns its queue. Cancelling settles every caller immediately,
// including work whose underlying engine cannot itself be interrupted.
export function createMeetingTaskQueue({concurrency=2,onPendingChange}={}){
  const controller=new AbortController();
  const waiting=[];
  const pending=new Set();
  let running=0;
  const cancelled=()=>new DOMException("Meeting session ended.","AbortError");
  const start=job=>{
    running+=1;
    Promise.resolve().then(()=>{
      if(controller.signal.aborted)throw cancelled();
      return job.task(controller.signal);
    }).then(job.resolve,job.reject).finally(()=>{
      running-=1;pending.delete(job);
      if(!controller.signal.aborted){onPendingChange?.(pending.size);drain();}
    });
  };
  const drain=()=>{
    while(!controller.signal.aborted&&running<concurrency&&waiting.length){
      start(waiting.shift());
    }
  };
  return{
    signal:controller.signal,
    run(task){
      if(controller.signal.aborted)return Promise.reject(cancelled());
      return new Promise((resolve,reject)=>{
        const job={task,resolve,reject};pending.add(job);waiting.push(job);
        onPendingChange?.(pending.size);drain();
      });
    },
    cancel(){
      controller.abort();
      for(const job of pending)job.reject(cancelled());
      pending.clear();waiting.length=0;onPendingChange?.(0);
    },
  };
}
