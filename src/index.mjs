import Session from './webhook.mjs'
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json',
  { flag: 'r', encoding: 'utf8' }
));

async function main() {
  const session = new Session({
    instance: config.mattermost_url,
    token: config.token
  });

  for (const team of Object.keys(config.migrate)) {
    for (const channel of Object.keys(config.migrate[team].channels)) {
      const messages = await session.getAllMessages(team, channel);

      console.log(messages.order.length);
    }
  }
}

main()
