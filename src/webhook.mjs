import mattermost from '@mattermost/client'


class Session {
  constructor({ instance, token }) {
    this.url = instance;
    this.token = token;

    this.client = new mattermost.Client4();
    this.client.setToken(this.token);
    this.client.setUrl(this.url);

    this.teamCache = {}
  }

  async getAllMessages(teamName, channelName) {
    var team = this.teamCache[teamName];
    if (!team)
      team = this.teamCache[teamName] = await this.client.getTeamByName('metwcc');

    const channel = await this.client.getChannelByName(team.id, channelName);

    return await this.client.getPostsSince(channel.id, 1);
  }
}


export default Session
