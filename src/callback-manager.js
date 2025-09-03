import express from 'express';


class HttpCallback {
  constructor() {
    this.app = express();

    this.app.use(express.json());

    this.callbacks = {};

    this.app.use((req, res) => {
      const callbackStr = req.path.replace(/^\/+/g, '');

      console.log(`[callbackServer] GOT ${callbackStr}`);

      if (this.callbacks[callbackStr]) {
        const callbackResponse = req._parsedUrl.query;
        this.callbacks[callbackStr](callbackResponse);

        delete this.callbacks[callbackStr];
      }

      res.send("ok");
    });
  }

  async serve(host, port) {
    this.app.listen(port, host, () => {
      console.log(`[callbackServer] UP ${host}:${port}`);
    });
  }

  waitfor(callbackStr) {
    return new Promise((res) => {
      this.callbacks[callbackStr] = res;
    });
  }
}


export default HttpCallback;
