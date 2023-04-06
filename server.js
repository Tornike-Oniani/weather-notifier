const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();

// Create an OAuth2 client
const oauth2Client = new OAuth2(
  '277869905424-i1mfunu15b1p5cdog7rasuvkeh6k5ska.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/oauth2callback'
);

// Set the scopes required for Gmail API
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

app.use(cors());

// Serve the public directory as a static folder
app.use(express.static(path.join(__dirname, 'public')));

// Define the route for serving index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Set up a route to handle the button click
app.get('/authorize', (req, res) => {
  // Generate the URL for Google's OAuth2 consent screen
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  // Redirect the user to the consent screen
  res.redirect(authorizeUrl);
});

// Set up a route to handle the OAuth2 redirect URI
app.get('/oauth2callback', async (req, res) => {
  // Exchange the authorization code for access and refresh tokens
  const { tokens } = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);
  console.log('Access token:', tokens.access_token);
  // Start monitoring incoming messages
  startMonitoring();
  // Redirect the user back to the home page
  res.redirect('/');
});

app.listen(3000, () => {
  console.log('Listen on the port 3000...');
});

// Function to start monitoring incoming messages
function startMonitoring() {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  async function sendEmail(to) {
    const subject = 'Weather response';
    const message = '<h1>Hello world!</h1>';

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

    await gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw,
      },
    });
  }

  // Periodically check for new messages
  setInterval(async () => {
    // Get ids of messages that are unread and contain word 'weather' in their subject
    const messageIds =
      (
        await gmail.users.messages.list({
          userId: 'me',
          q: 'subject:weather is:unread',
        })
      ).data.messages || [];

    // If no messages were found just return
    if (messageIds.length === 0) {
      console.log('Nothing found...');
      return;
    }

    // messages.list above only returns ids and threadIds not the whole body, so now we have to get whole messages one by one with their ids
    let message;
    for (const messageIdInfo of messageIds) {
      message = (
        await gmail.users.messages.get({ userId: 'me', id: messageIdInfo.id })
      ).data;

      // From headers extract the email who send the request for weather forecast
      let from = message.payload.headers.find((h) => h.name === 'From').value;
      from = from.substring(from.indexOf('<') + 1, from.lastIndexOf('>'));

      // Modify the message status from unread to read
      await gmail.users.messages.modify({
        userId: 'me',
        id: message.id,
        resource: { removeLabelIds: ['UNREAD'] },
      });
      await sendEmail(from);
    }
  }, 15000); // Check every 15 seconds
}
