var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const LRU = require("lru-cache");
const helmet = require("helmet");
require('dotenv').config(); // Load environment variables from .env file
const SpotifyWebApi = require('spotify-web-api-node');

var indexRouter = require('./routes/index');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '0' // oder 'no-cache'
}))

app.use('/', indexRouter);
//app.use('/api', apiRouter);

// Spotify API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_API_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// Simple in-memory cache for recent queries of map locations
const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 60, // 1 hour TTL
});

app.get('/login', (req, res) => {
  // Define the scopes for authorization; these are the permissions we ask from the user.
  const scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-modify-playback-state', 'playlist-read-private', 'playlist-read-collaborative',];
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

    // Refresh the access token periodically before it expires.
    setInterval(async () => {
      const data = await spotifyApi.refreshAccessToken();
      const accessTokenRefreshed = data.body['access_token'];
      spotifyApi.setAccessToken(accessTokenRefreshed);
    }, expiresIn / 2 * 1000); // Refresh halfway before expiration.

    // redirect to home page
    res.redirect('/');

  }).catch(error => {
    console.error('Error getting Tokens:', error);
    res.send('Error getting tokens');
  });
});

app.get("/getCurrentTrack", async (req, res) => {
  try {
    const data = await spotifyApi.getMyCurrentPlayingTrack();
    res.json(data.body);
  } catch (error) {
    console.error('Error getting current track:', error);
    res.status(500).send('Error getting current track');
  }
});

app.post("/playPause", async (req, res) => {
  try {
    const data = await spotifyApi.getMyCurrentPlaybackState();
    if (data.body.is_playing) {
      await spotifyApi.pause();
    } else {
      await spotifyApi.play();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling play/pause:', error);
    res.status(500).send('Error toggling play/pause');
  }
});

app.post('/skip', async (req, res) => {
  try {
    await spotifyApi.skipToNext();
    res.json({ success: true });
  } catch (error) {
    console.error('Error skipping track:', error);
    res.status(500).send('Error skipping track');
  }
});

app.post('/previous', async (req, res) => {
  try {
    await spotifyApi.skipToPrevious();
    res.json({ success: true });
  } catch (error) {
    console.error('Error going to previous track:', error);
    res.status(500).send('Error going to previous track');
  }
});

app.get('/playlists', async (req, res) => {
  try {
    const data = await spotifyApi.getUserPlaylists();
    res.json(data.body);
  } catch (error) {
    console.error('Error getting playlists:', error);
    res.status(500).send('Error getting playlists');
  }
});

app.get('/playlists/:playlistId/tracks', async (req, res) => {
  const playlistId = req.params.playlistId;
  try {
    const data = await spotifyApi.getPlaylistTracks(playlistId);
    res.json(data.body);
  } catch (error) {
    console.error('Error getting playlist tracks:', error);
    res.status(500).send('Error getting playlist tracks');
  }
});

app.post('/playlists/:playlistId/shuffle', async (req, res) => {
  const playlistId = req.params.playlistId;
  try {
    // Get the tracks of the playlist
    const data = await spotifyApi.getPlaylistTracks(playlistId);
    const tracks = data.body.items.map(item => item.track.uri);
    // Shuffle the tracks
    const shuffledTracks = tracks.sort(() => Math.random() - 0.5);
    // Start playback with shuffled tracks
    await spotifyApi.play({ uris: shuffledTracks });
    res.json({ success: true });
  } catch (error) {
    console.error('Error playing shuffled playlist:', error);
    res.status(500).send('Error playing shuffled playlist');
  }
});

// Play a specific track in playlist (and then queue next ones)
app.post('/playlists/:playlistId/playTrack', async (req, res) => {
  const playlistId = req.params.playlistId;
  const trackUri = req.body.trackUri;
  try {
    const data = await spotifyApi.getPlaylistTracks(playlistId);
    const tracks = data.body.items.map(item => item.track.uri);

    await spotifyApi.play({ uris: [trackUri, ...tracks.filter(uri => uri !== trackUri)] });
    res.json({ success: true });
  } catch (error) {
    console.error('Error playing track from playlist:', error);
    res.status(500).send('Error playing track from playlist');
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing required parameter: q" });

    const limit = Math.min(50, parseInt(req.query.limit, 10) || 5);
    const country = req.query.country ? req.query.country.trim() : null;

    const cacheKey = `nomin:${q}|${limit}|${country || ""}`;
    if (cache.has(cacheKey)) {
      return res.json({ source: "cache", results: cache.get(cacheKey) });
    }

    // Nominatim search endpoint
    const endpoint = "https://nominatim.openstreetmap.org/search";
    // Build params
    const params = {
      q,
      format: "json",
      addressdetails: 1,
      limit,
      extratags: 1,
      namedetails: 1,
    };
    if (country) params.countrycodes = country; // comma separated a2 codes

    // Nominatim requires a valid User-Agent or "email" param; set a user agent header
    const headers = {
      "User-Agent": "CarPlay1.0 (postfach@tolutz.de)",
      Accept: "application/json",
    };

    const response = await axios.get(endpoint, { params, headers, timeout: 8000 });
    const data = Array.isArray(response.data) ? response.data : [];

    // Map to the simplified structure the client asked for
    const results = data.map((item) => {
      // name: prefer namedetails or display_name
      const name =
        (item.namedetails && (item.namedetails.name || item.namedetails["name:en"])) ||
        item.display_name ||
        item.osm_type ||
        "Unknown";

      return {
        name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        type: item.type || item.class || null,
        display_name: item.display_name || null,
        raw: item, // optionally keep raw result for debugging (remove in prod to save bandwidth)
      };
    });

    cache.set(cacheKey, results);
    return res.json({ source: "nominatim", results });
  } catch (err) {
    console.error("Search error:", err?.message || err);
    // Return a friendly error message but not full stack in production
    return res.status(500).json({ error: "Search service unavailable" });
  }
});


app.use((req, res, next) => {
  if (req.path.endsWith('.json')) {
    res.type('application/json');
  }
  next();
});

module.exports = app;
