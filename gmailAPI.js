const { google } = require('googleapis');
const { OAuth2 } = google.auth;

class GmailAPI {
  constructor(clientOptions, scopes) {
    (this.oauth2Client = new OAuth2(...clientOptions)),
      (this.scopes = scopes),
      (this.gmail = null);
  }

  generateURLForConsent() {
    const authorizeURL = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
    });

    return authorizeURL;
  }

  async setTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    // console.log('Access token:', tokens.access_token);
  }

  async getMessageIdInfos(filter) {
    return (
      (await this.gmail.users.messages.list({ userId: 'me', q: filter })).data
        .messages || []
    );
  }

  async getMessageBody(messageId) {
    return (
      await this.gmail.users.messages.get({ userId: 'me', id: messageId })
    ).data;
  }

  async markMessageAsRead(messageId) {
    await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: { removeLabelIds: ['UNREAD'] },
    });
  }

  async sendEmail(to, subject, message) {
    function createMessage() {
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString(
        'base64'
      )}?=`;
      const messageParts = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        message,
      ];

      const messageText = messageParts.join('\n');
      const encodedMessage = Buffer.from(messageText)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      return encodedMessage;
    }

    const raw = createMessage();

    await this.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw,
      },
    });
  }
}

module.exports = GmailAPI;
