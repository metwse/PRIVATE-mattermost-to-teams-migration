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
callbackServer.serve(config.http_host, config.http_port);

async function main() {
  const session = new Session({
    instance: config.mattermost_url,
    token: config.token
  });

  for (const team of Object.keys(config.migrate)) {
    for (const channel of Object.keys(config.migrate[team].channels)) {
      const progressKey = `${team}/${channel}`;
      const messages = await session.getAllMessages(team, channel);

      if (progress[progressKey] == 'done')
        continue;

      messages.setCursor(progress[progressKey]);

      while (true) {
        const chunk = messages.getChunk(24);

        if (!chunk || chunk.length == 0)
          break;

        const webhookMessage = new WebhookMessage(
          config.webhook_url,
          config.public_host,
          chunk
        );

        console.log(`[main] QUEUE ${chunk.length} messages`);
        await webhookMessage.send(
          config.migrate[team]['team-id'],
          config.migrate[team].channels[channel],
        );

        progress[progressKey] = chunk[chunk.length - 1].id;

        if (messages.end)
          progress[progressKey] = 'done';

        saveProgress();
      }
    }
  }

  console.log("[main] DONE");
  process.exit();
}


main();
