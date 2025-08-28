import mattermost from '@mattermost/client'


class Session {
  constructor({ instance, token }) {
    this.url = instance;
    this.token = token;

    this.client = new mattermost.Client4();
    this.client.setToken(this.token);
    this.client.setUrl(this.url);
  }
}


export default Session
