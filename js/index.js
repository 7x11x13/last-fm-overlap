const constants = Object.freeze({
    API_URL: 'https://ws.audioscrobbler.com/2.0/',
    VALID_USERNAME_REGEX: new RegExp('[\\w-]+'), // old usernames may contain other characters
    TYPE_ARTIST: 'artist',
    TYPE_ALBUM: 'album',
    TYPE_TRACK: 'track',
    LIMIT: 1000, // maximum 1000
    API_KEY: '6e06d6eb3a8a25c7d5f485f92f81d172'
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
        api_key: constants.API_KEY,
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

function generate_results_error(err) {
    return '<div class="alert alert-danger mt-5">' + 
                err +
            '</div>';
}

function generate_results(results) {
    if (typeof results != 'undefined' && results.length > 0) {
        ret = '<table class="table mt-5">\
                 <thead>\
                   <th scope="col">Rank</th>\
                   <th scope="col">Name</th>\
                   <th scope="col">Combined playcount</th>\
                   <th scope="col">Lowest rank</th>\
                 </thead>\
                 <tbody>';
        for (let i = 0; i < results.length; ++i) {
            ret += '<tr>';
            ret += '<th scope="row">' + (i+1) + '</th>';
            ret += '<td>' + results[i].name + '</td>';
            ret += '<td>' + results[i].playcount + '</td>';
            ret += '<td>' + results[i].maxrank + '</td>';
            ret += '</tr>';
        }
        ret += '</tbody></table>';
        return ret
    } else {
        return '<h1 class="mt-5">No overlap :(</h1>'
    }
}

$('form').on('submit', () => {
    const user1 = $('#user1').val();
    const user2 = $('#user2').val();
    const type = $('#type').val();

    $('#results').empty();

    if (!constants.VALID_USERNAME_REGEX.test(user1) || !constants.VALID_USERNAME_REGEX.test(user2)) {
        $('#results').append(generate_results_error('Invalid username'));
        return false;
    }

    $('#form-button').prop('disabled', true);

    const users = [user1, user2];

    Promise.all(
        users.map(name => get_top_funcs[type](name, constants.LIMIT))
    )
    .then(values => {
        let top_artists = values.map(convert_funcs[type]);
        const mutual = get_mutual_likes(top_artists);
        $('#results').append(generate_results(mutual));
    })
    .catch(err => {
        $('#results').append(generate_results_error(err));
    })
    .finally(() => {
        $('#form-button').prop('disabled', false);
    });
    return false;
});

/*router.post('/', function(req, res, next) {
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
});*/