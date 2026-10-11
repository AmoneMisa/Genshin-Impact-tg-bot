export function requestUrl(req) {
  // Host is an untrusted header and is unnecessary for local route resolution.
  return new URL(req.url, 'http://localhost');
}

export function requestBoundary(handle, fail) {
  return (req,res) => {
    Promise.resolve().then(() => handle(req,res)).catch(error => {
      if (res.destroyed) return;
      if (res.headersSent) {res.destroy();return;}
      if (error.code === 'ERR_INVALID_URL') {
        res.writeHead(400, {'content-type':'application/json; charset=utf-8'});
        res.end(JSON.stringify({error:'Invalid request URL'}));
        return;
      }
      fail(res,error);
    });
  };
}
