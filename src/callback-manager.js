import express from 'express';


class HttpCallback {
  constructor() {
    this.app = express();

    this.app.use(express.json());

    this.callbacks = {};

    this.app.use((req, res) => {
      const callbackStr = req.path.replace(/^\/+/g, '');

      console.log(`[callbackServer] GOT ${callbackStr}`);

      this.lastCallback = callbackStr;

      if (this.callbacks[callbackStr]) {
        const callbackResponse = req._parsedUrl.query;
        this.callbacks[callbackStr](callbackResponse);

        delete this.callbacks[callbackStr];
      }

      res.send("ok");
    });
  }

  serve(host, port) {
    return new Promise((res) => this.app.listen(port, host, () => {
      console.log(`[callbackServer] UP ${host}:${port}`);
      res();
    }));
  }

  waitfor(callbackStr) {
    return new Promise((res) => {
      this.callbacks[callbackStr] = res;
    });
  }
}


export default HttpCallback;
