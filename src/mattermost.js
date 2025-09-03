import mattermost from '@mattermost/client';


function isMessageValid(message) {
  return (
    !message.props.deleteBy &&
    !message.type.includes('system_') &&
    !message.delete_at
  );
}

// Mattermost session wrapper.
class Session {
  constructor({ instance, token }) {
    this.url = instance;
    this.token = token;

    this.client = new mattermost.Client4();
    this.client.setToken(this.token);
    this.client.setUrl(this.url);

    this.teamCache = {};
    this.userCache = {};
  }

  async getUser(userId) {
    if (this.userCache[userId])
      return this.userCache[userId];

    return this.userCache[userId] = await this.client.getUser(userId);
  }

  async getAllMessages(teamName, channelName) {
    var team = this.teamCache[teamName];
    if (!team)
      team = this.teamCache[teamName] = await this.client.getTeamByName(teamName);

    const channel = await this.client.getChannelByName(team.id, channelName);

    const posts =  await this.client.getPostsSince(channel.id, 1);

    for (const post of Object.values(posts.posts)) {
      post.user = await this.getUser(post.user_id);

      if (post.metadata?.files)
        for (const file of post.metadata.files)
          file.publicUrl = (await this.client.getFilePublicLink(file.id)).link;
    }

    posts.order = posts.order.reverse();

    return new Messages(posts, null);
  }
}

// Client-side message fiter API.
class Messages {
  constructor(messages) {
    this.messages = messages;
    this.cursor = 0;
  }

  setCursor(lastMessageId) {
    this.cursor = this.messages.order.indexOf(lastMessageId) + 1;
    this.end = this.cursor == this.messages.order.length;
  }

  // Gets up to `limit` amount of valid messages.
  getChunk(limit = 24) {
    const result = [];

    if (this.end)
      return false;

    while (this.cursor < this.messages.order.length && result.length < limit) {
      const message = this.messages.posts[this.messages.order[this.cursor]];

      if (isMessageValid(message))
        result.push(message);

      this.cursor++;
    }

    this.end = this.cursor == this.messages.order.length;

    return result;
  }
}

export default Session;
