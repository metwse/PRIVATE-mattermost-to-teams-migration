import Session from './webhook.mjs'
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('config.json',
    { flag: 'r', encoding: 'utf8' }
));

async function main() {
  new Session({
    instance: config.mattermost_url,
    token: config.token
  });
}

main()
