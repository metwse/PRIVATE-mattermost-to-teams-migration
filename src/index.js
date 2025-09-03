/* global callbackServer:writable */

import HttpCallback from './callback-manager.js';
import Session from './mattermost.js';
import WebhookMessage from './webhook.js';
import fs from 'fs';


const config = JSON.parse(fs.readFileSync('config.json',
  { flag: 'r', encoding: 'utf8' }
));

let progress;
try {
  progress = JSON.parse(fs.readFileSync('progress.json',
    { flag: 'r', encoding: 'utf8' }
  ));
} catch {
  progress = {};
}

function saveProgress() {
  fs.writeFileSync('progress.json', JSON.stringify(progress),
    { flag: 'w', encoding: 'utf8' }
  );
}

globalThis.callbackServer = new HttpCallback();

async function main() {
  await callbackServer.serve(config.http_host, config.http_port);

  const session = new Session({
    instance: config.mattermost_url,
    token: config.token
  });

  for (const team of Object.keys(config.migrate)) {
    for (const channel of Object.keys(config.migrate[team].channels)) {
      const progressKey = `${team}/${channel}`;
      console.log(`[main/${progressKey}] FETCHING`);
      const messages = await session.getAllMessages(team, channel);

      messages.setCursor(progress[progressKey]);

      while (true) {
        const chunk = messages.getChunk(8);

        if (!chunk || chunk.length == 0)
          break;

        const webhookMessage = new WebhookMessage(
          config.webhook_url,
          config.public_host,
          chunk
        );

        console.log(`[main/${progressKey}] QUEUE ${chunk.length} messages`);
        while (await Promise.any(
          [
            webhookMessage.send(
              config.migrate[team]['team-id'],
              config.migrate[team].channels[channel],
            ),
            new Promise(r => {
              let last = callbackServer.lastCallback;

              const timeout = () => setTimeout(() => {
                if (last == callbackServer.lastCallback) {
                  r('timeout');
                } else {
                  last = callbackServer.lastCallback;
                  timeout();
                }
              }, 15000);

              timeout();
            })
          ]
        ) == 'timeout') {
          console.log(`[main/${progressKey}] TIMEOUT retransmit`);
        }

        progress[progressKey] = chunk[chunk.length - 1].id;

        saveProgress();
      }
      console.log(`[main/${progressKey}] DONE`);
    }
  }

  console.log("[main] DONE");
  process.exit();
}


main();
