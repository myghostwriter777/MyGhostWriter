import { createMeetingTaskQueue } from "./meetingTaskQueue";

const flush=async()=>{for(let i=0;i<8;i+=1)await Promise.resolve();};

test("limits inference concurrency and advances queued work after a failure",async()=>{
  const pending=[];
  const queue=createMeetingTaskQueue({concurrency:2});
  const task=jest.fn(()=>new Promise((resolve,reject)=>pending.push({resolve,reject})));
  const jobs=[queue.run(task).catch(error=>error.message),queue.run(task),queue.run(task)];
  await flush();
  expect(task).toHaveBeenCalledTimes(2);
  pending[0].reject(new Error("failed"));
  await flush();
  expect(task).toHaveBeenCalledTimes(3);
  pending[1].resolve("second");pending[2].resolve("third");
  await expect(Promise.all(jobs)).resolves.toEqual(["failed","second","third"]);
});

test("cancels both hung and queued work so a new session can start immediately",async()=>{
  const oldQueue=createMeetingTaskQueue({concurrency:1});
  const neverFinishes=jest.fn(()=>new Promise(()=>{}));
  const queued=jest.fn();
  const running=oldQueue.run(neverFinishes).catch(error=>error.name);
  const waiting=oldQueue.run(queued).catch(error=>error.name);
  await flush();oldQueue.cancel();
  await expect(Promise.all([running,waiting])).resolves.toEqual(["AbortError","AbortError"]);
  expect(oldQueue.signal.aborted).toBe(true);
  expect(queued).not.toHaveBeenCalled();
  const newQueue=createMeetingTaskQueue();
  await expect(newQueue.run(()=>"fresh session")).resolves.toBe("fresh session");
});
