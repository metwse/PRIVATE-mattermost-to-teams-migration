import dotenv from 'dotenv'
import Session from './webhook.mjs'

dotenv.config({ quiet: true })

async function main() {
  const session = new Session(process.env.MATTERMOST_URL, process.env.TOKEN);

  console.log(await session.client.getUser(process.env.USER_ID));
}

main()
