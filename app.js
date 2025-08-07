var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config(); // Load environment variables from .env file
const SpotifyWebApi = require('spotify-web-api-node');

var indexRouter = require('./routes/index');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
//app.use('/api', apiRouter);

console.log(process.env)

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_API_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

app.get('/login', (req, res) => {
  // Define the scopes for authorization; these are the permissions we ask from the user.
  const scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-modify-playback-state'];
  // Redirect the client to Spotify's authorization page with the defined scopes.
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req, res) => {
  // Extract the error, code, and state from the query parameters.
  const error = req.query.error;
  const code = req.query.code;

  // If there is an error, log it and send a response to the user.
  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  // Exchange the code for an access token and a refresh token.
  spotifyApi.authorizationCodeGrant(code).then(data => {
    const accessToken = data.body['access_token'];
    const refreshToken = data.body['refresh_token'];
    const expiresIn = data.body['expires_in'];

    // Set the access token and refresh token on the Spotify API object.
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refreshToken);

    // Logging tokens can be a security risk; this should be avoided in production.
    console.log('The access token is ' + accessToken);
    console.log('The refresh token is ' + refreshToken);

    // Send a success message to the user.
    res.send('Login successful! You can now use the /search and /play endpoints.');

    // Refresh the access token periodically before it expires.
    setInterval(async () => {
      const data = await spotifyApi.refreshAccessToken();
      const accessTokenRefreshed = data.body['access_token'];
      spotifyApi.setAccessToken(accessTokenRefreshed);
    }, expiresIn / 2 * 1000); // Refresh halfway before expiration.

  }).catch(error => {
    console.error('Error getting Tokens:', error);
    res.send('Error getting tokens');
  });
});


module.exports = app;
