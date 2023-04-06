const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const path = require("path");
const express = require("express");
const cors = require("cors");
const app = express();

// Create an OAuth2 client
const oauth2Client = new OAuth2(
  "277869905424-i1mfunu15b1p5cdog7rasuvkeh6k5ska.apps.googleusercontent.com",
  "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",
  "http://localhost:3000/oauth2callback"
);

// Set the scopes required for Gmail API
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

app.use(cors());

// Serve the public directory as a static folder
app.use(express.static(path.join(__dirname, "public")));

// Define the route for serving index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Set up a route to handle the button click
app.get("/authorize", (req, res) => {
  // Generate the URL for Google's OAuth2 consent screen
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  // Redirect the user to the consent screen
  res.redirect(authorizeUrl);
});

// Set up a route to handle the OAuth2 redirect URI
app.get("/oauth2callback", async (req, res) => {
  // Exchange the authorization code for access and refresh tokens
  const { tokens } = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);
  console.log("Access token:", tokens.access_token);
  // Start monitoring incoming messages
  startMonitoring();
  // Redirect the user back to the home page
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("Listen on the port 3000...");
});

// Function to start monitoring incoming messages
function startMonitoring() {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Periodically check for new messages
  setInterval(() => {
    gmail.users.messages.list({ userId: "me", q: "is:unread" }, (err, res) => {
      if (err) {
        console.error(err);
        return;
      }
      const messages = res.data.messages || [];
      if (messages.length > 0) {
        console.log(`Found ${messages.length} new unread messages`);
        messages.forEach((message) => {
          gmail.users.messages.get(
            { userId: "me", id: message.id },
            (err, res) => {
              if (err) {
                console.error(err);
                return;
              }
              const snippet = res.data.snippet;
              console.log(`New message: ${snippet}`);
            }
          );
        });
      }
    });
  }, 5000); // Check every 5 seconds
}
