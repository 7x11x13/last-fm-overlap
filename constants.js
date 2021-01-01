module.exports = Object.freeze({
    API_URL: 'http://ws.audioscrobbler.com/2.0/',
    VALID_USERNAME_REGEX: new RegExp('[\\w-]+'), // old usernames may contain other characters
    TYPE_ARTIST: 'artist',
    TYPE_ALBUM: 'album',
    TYPE_TRACK: 'track',
    LIMIT: 500 // maximum 1000
});