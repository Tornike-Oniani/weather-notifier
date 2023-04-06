const GmailAPI = require('./gmailAPI');
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();

// Create an OAuth2 client
const clientOptions = [
  '277869905424-i1mfunu15b1p5cdog7rasuvkeh6k5ska.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/oauth2callback',
];

// Set the scopes required for Gmail API
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

const gmailAPI = new GmailAPI(clientOptions, SCOPES);

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
  const authorizeUrl = gmailAPI.generateURLForConsent();
  // Redirect the user to the consent screen
  res.redirect(authorizeUrl);
});

// Set up a route to handle the OAuth2 redirect URI
app.get('/oauth2callback', async (req, res) => {
  // Exchange the authorization code for access and refresh tokens
  gmailAPI.setTokens(req.query.code);
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
  // Periodically check for new messages
  setInterval(async () => {
    // Get ids of messages that are unread and contain word 'weather' in their subject
    const messageIdInfos = await gmailAPI.getMessageIdInfos(
      'subject:weather is:unread'
    );

    // If no messages were found just return
    if (messageIdInfos.length === 0) {
      return;
    }

    // messages.list above only returns ids and threadIds not the whole body, so now we have to get whole messages one by one with their ids
    let message;
    for (const messageIdInfo of messageIdInfos) {
      message = await gmailAPI.getMessageBody(messageIdInfo.id);

      // From headers extract the email who send the request for weather forecast
      let from = message.payload.headers.find((h) => h.name === 'From').value;
      from = from.substring(from.indexOf('<') + 1, from.lastIndexOf('>'));

      // Modify the message status from unread to read
      await gmailAPI.markMessageAsRead(message.id);
      await gmailAPI.sendEmail(
        from,
        'Weather response',
        '<h1>Hello world!</h1>'
      );
    }
  }, 15000); // Check every 15 seconds
}
