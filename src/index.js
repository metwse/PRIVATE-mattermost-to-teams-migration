/* global callbackServer:writable */

import HttpCallback from './callback-manager.js';
import Session from './mattermost.js';
import WebhookMessage from './webhook.js';
import fs from 'fs';


const config = JSON.parse(fs.readFileSync('config.json',
  { flag: 'r', encoding: 'utf8' }
));

globalThis.callbackServer = new HttpCallback();
callbackServer.serve(config.http_host, config.http_port);

async function main() {
  const session = new Session({
    instance: config.mattermost_url,
    token: config.token
  });

  for (const team of Object.keys(config.migrate)) {
    for (const channel of Object.keys(config.migrate[team].channels)) {
      const messages = await session.getAllMessages(team, channel);

      let chunk;
      while ((chunk = messages.getChunk(24))) {
        const webhookMessage = new WebhookMessage(
          config.webhook_url,
          config.public_host,
          chunk
        );

        webhookMessage.send(
          config.migrate[team]['team-id'],
          config.migrate[team].channels[channel],
        );
      }
    }
  }
}


main();
