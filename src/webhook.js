/* global callbackServer */

class WebhookMessage {
  constructor(url, host, messages) {
    this.files = [];
    this.messages = messages;
    this.url = url;
    this.host = host;

    for (const message of messages) {
      if (message.metadata?.files)
        for (const file of message.metadata.files) {
          this.files.push(file);
        }
    }
  }

  async send(teamId, channelId) {
    if (this.messages.length == 0)
      return;

    const uploadPromises = this.files.map(f => callbackServer.waitfor(f.id));

    if (uploadPromises.length) {
      await this.sendRequest({
        type: 'message',
        attachments: this.files.map(f => ({
          contentType: 'file',
          content: {
            type: 'file',
            name: `/mattermost/${f.user_id}/${f.id}/${f.name}`,
            url: f.publicUrl,
            callback: `${this.host}/${f.id}`,
          }
        }))
      });

      console.log(`[webhook] UPLOADING ${this.files.length} files`);
      const fileUrls = await Promise.all(uploadPromises);

      this.files.forEach((f, i) => f.oneDriveUrl = fileUrls[i]);
    }

    const callback = callbackServer.waitfor(this.messages[0].id);

    const cards = [];

    for (const m of this.messages) {
      if (!m.user)
        continue;

      const card = {
        contentType: 'application/vnd.microsoft.card.adaptive',
        channelId,
        teamId,
        content: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  items: [
                    {
                      type: 'TextBlock',
                      weight: 'Bolder',
                      text: `@${m.user.username}`,
                      wrap: true
                    },
                    {
                      type: 'TextBlock',
                      spacing: 'None',
                      text: `${new Date(m.create_at).toLocaleString('tr')}`,
                      isSubtle: true,
                      wrap: true
                    }
                  ],
                  width: 'stretch'
                }
              ]
            },
            {
              type: 'TextBlock',
              text: m.message,
              wrap: true
            }
          ],
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          version: '1.6',
          actions: m.metadata.files ?
            m.metadata.files.map(f => ({
              type: 'Action.OpenUrl',
              title: f.name,
              url: f.oneDriveUrl
            }))
            : undefined
        }
      };

      cards.unshift(card);

      if (card.content.actions?.length > 6) {
        cards.unshift({
          contentType: 'application/vnd.microsoft.card.adaptive',
          channelId,
          teamId,
          content: {
            type: 'AdaptiveCard',
            body: [
              {
                type: 'TextBlock',
                text: 'SYSTEM',
                weight: 'Bolder',
              },
              {
                type: 'TextBlock',
                text: `This message contains attachments of @${m.user.username}'s previous message.`,
                wrap: true,
              }
            ],
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.6',
            actions: card.content.actions.slice(6)
          }
        });
      }
    }

    await this.sendRequest({
      type: 'message',
      attachments:
      [
        ...cards.reverse(),
        {
          contentType: 'end',
          content: {
            type: 'end',
            callback: `${this.host}/${this.messages[0].id}`
          }
        },
      ]
    });

    console.log(`[webhook] SENDING ${cards.length} messages`);
    await callback;
  }

  async sendRequest(msg) {
    await fetch(this.url, {
      method: 'POST',
      body: JSON.stringify(msg),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}


export default WebhookMessage;
