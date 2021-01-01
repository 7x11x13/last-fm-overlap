const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const constants = require('../constants');

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', {});
});


function get_api_url(params) {
    let url = `${constants.API_URL}?`;
    for (const [key, value] of Object.entries(params)) {
        url += `${key}=${value}&`;
    }
    url = url.slice(0, -1);
    return url;
}

function get_top(username, limit, method) {
    const url = get_api_url({
        method: method,
        user: username,
        api_key: process.env.API_KEY,
        format: 'json',
        limit: limit
    });
    return fetch(url).then(res => res.json());
}

function get_top_artists(username, limit) {
    return get_top(username, limit, 'user.gettopartists');
}

function get_top_albums(username, limit) {
    return get_top(username, limit, 'user.gettopalbums');
}

function get_top_tracks(username, limit) {
    return get_top(username, limit, 'user.gettoptracks');
}

function convert_top_artists_response(response) {
    if (typeof response.error != 'undefined') {
        throw response.message;
    }
    return response.topartists.artist.map(
        artist => ({
            name: artist.name,
            playcount: parseInt(artist.playcount),
            rank: parseInt(artist['@attr'].rank)
        })
    );
}

function convert_top_albums_response(response) {
    if (typeof response.error != 'undefined') {
        throw response.message;
    }
    return response.topalbums.album.map(
        album => ({
            name: `${album.artist.name} - ${album.name}`,
            playcount: parseInt(album.playcount),
            rank: parseInt(album['@attr'].rank)
        })
    );
}

function convert_top_tracks_response(response) {
    if (typeof response.error != 'undefined') {
        throw response.message;
    }
    return response.toptracks.track.map(
        track => ({
            name: `${track.artist.name} - ${track.name}`,
            playcount: parseInt(track.playcount),
            rank: parseInt(track['@attr'].rank)
        })
    );
}

const convert_funcs = {
    [constants.TYPE_ARTIST]: convert_top_artists_response,
    [constants.TYPE_ALBUM]: convert_top_albums_response,
    [constants.TYPE_TRACK]: convert_top_tracks_response
};

const get_top_funcs = {
    [constants.TYPE_ARTIST]: get_top_artists,
    [constants.TYPE_ALBUM]: get_top_albums,
    [constants.TYPE_TRACK]: get_top_tracks
};

function get_mutual_likes(data) {
    let ret = [];
    for (const obj1 of data[0]) {
        const obj2 = data[1].find(obj => obj.name === obj1.name);
        if (typeof obj2 != 'undefined') {
            ret.push({
                name: obj1.name,
                playcount: obj1.playcount + obj2.playcount,
                maxrank: Math.max(obj1.rank, obj2.rank)
            });
        }
    }
    return ret.sort((a, b) => a.maxrank - b.maxrank);
}

router.post('/', function(req, res, next) {
    const user1 = req.body['user1'];
    const user2 = req.body['user2'];
    const type = req.body['type'];

    if (!constants.VALID_USERNAME_REGEX.test(user1) || !constants.VALID_USERNAME_REGEX.test(user2)) {
        res.render('index', {error: 'Invalid username'});
        return;
    }

    const users = [user1, user2];

    Promise.all(
        users.map(name => get_top_funcs[type](name, constants.LIMIT))
    )
        .then(values => {
            let top_artists = values.map(convert_funcs[type]);
            const mutual = get_mutual_likes(top_artists);
            res.render('index', {user1: user1, user2: user2, results: mutual});
        })
        .catch(err => {
            res.render('index', {error: err});
        });
});

module.exports = router;
