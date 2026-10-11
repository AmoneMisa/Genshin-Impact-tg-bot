/** One read at a time. An action invalidates its older read; close aborts it altogether. */
export function createPoller(task, {interval=2000, enabled=()=>true}={}) {
  let stopped=false, timer=null, controller=null, revision=0, failures=0;
  function invalidate() { revision++;controller?.abort(); }
  async function tick() {
    if (stopped) return;
    if (document.hidden || !enabled()) { timer=setTimeout(tick,interval);return; }
    const version=revision, request=new AbortController();controller=request;
    try {
      await task({signal:request.signal,current:()=>!stopped && !request.signal.aborted && revision===version});
      failures=0;
    } catch (error) { if (error.name!=='AbortError') failures=Math.min(failures+1,4); }
    finally { controller=null;if (!stopped)timer=setTimeout(tick,interval*2**failures); }
  }
  timer=setTimeout(tick,interval);
  return {invalidate,stop(){stopped=true;clearTimeout(timer);invalidate();}};
}
