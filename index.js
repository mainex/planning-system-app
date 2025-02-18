const sqlite3 = require('sqlite3').verbose(); // include sqlite library

let db = new sqlite3.Database('./db/planning-system.db', (err) => { // create in-memory database
    if (err) {  // if set then error, else if null, no error
        return console.err(err.message);
    }
    console.log('Connected to the file-based SQlite database.');
}); 


db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS user(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, firstname TEXT NOT NULL, lastname TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS eventType(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS organizer(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS event(id INTEGER PRIMARY KEY, eventTypeID INTEGER NOT NULL, organizerID INTEGER NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL, datetime INTEGER NOT NULL, locationLatitude REAL NOT NULL, locationLongtitude REAL NOT NULL, maxParticpants INTEGER NOT NULL, FOREIGN KEY(eventTypeID) REFERENCES eventType(id), FOREIGN KEY(organizerID) REFERENCES organizer(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS reservation(id INTEGER PRIMARY KEY, eventID INTEGER NOT NULL, userID INTEGER NOT NULL, FOREIGN KEY(eventID) REFERENCES event(id), FOREIGN KEY(userID) REFERENCES user(id))`);
});

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

function isAlphaNumeric(input) {
    const val = input.trim(); 
    const RegEx = /^[a-z0-9]+$/i; 
    const res = RegEx.test(val);

    return res;
}

function isNumeric(input) {
    const val = input.trim(); 
    const RegEx = /^[0-9]+$/i; 
    const res = RegEx.test(val);

    return res;
}

function are_user_details_defined(username, firstname, lastname) {
    var status = true;
    var message = "";

    if (username == undefined) {
        status = false;
        message += "The username must be defined. ";
    }
    if (firstname == undefined) {
        status = false;
        message += "The firstname must be defined. ";
    }
    if (lastname == undefined) {
        status = false;
        message += "The lastname must be defined. ";
    }
    return [status, message];
}

function are_user_details_valid(username, firstname, lastname) {
    var status = true;
    var message = "";
    if (username == "") {
        status = false;
        message += "The username must not be empty. ";
    }

    if (firstname == "") {
        status = false;
        message += "The firstname must contain at least 2 characters. ";
    }

    if (firstname.length < 2) {
        status = false;
        message += "The firstname must contain at least 2 characters. ";
    }
    if (lastname.length < 2) {
        status = false;
        message += "The lastname must contain at least 2 characters. ";
    }

    if (!isAlphaNumeric(username)) {
        status = false;
        message += "The username must contain only alphanumeric characters. ";
    }

    return [status, message];
}


function is_length_valid(name) {
    var status = true;
    var message = "";

    if (name == undefined) {
        status = false;
        message += "The name must be defined. ";
    }

    if (name.length < 2 || name.length > 255) {
        status = false;
        message += "The name must be between 2-255 characters long. ";
    }

    return {
        status: status,
        message: message
    };
}

function are_event_parameters_valid(eventTypeID, organizerID, name, price,
    datetime, locationLatitude, locationLongtitude, maxParticpants) {
    var status = true;
    var message = "";

    if (eventTypeID == undefined) {
        status = false;
        message += "The lastname must be defined. ";
    }

    if (organizerID == undefined) {
        status = false;
        message += "The organizerID must be defined. ";
    }

    if (name == undefined) {
        status = false;
        message += "The name must be defined. ";
    }

    if (price == undefined) {
        status = false;
        message += "The price must be defined. ";
    }

    if (datetime == undefined) {
        status = false;
        message += "The datetime must be defined. ";
    }

    if (locationLatitude == undefined) {
        status = false;
        message += "The locationLatitude must be defined. ";
    }

    if (locationLongtitude == undefined) {
        status = false;
        message += "The locationLongtitude must be defined. ";
    }

    if (maxParticpants == undefined) {
        status = false;
        message += "The maxParticpants must be defined. ";
    }

    
    return {
        status: status,
        message: message
    };
}

// creates a new user
app.post('/api/user/create', (req, res) => {
    const posted_user = req.body; // submitted user - picked from body
    const username = posted_user.username, firstname = posted_user.firstname, lastname = posted_user.lastname;

    // check that input is defined
    const def_res = are_user_details_defined(username, firstname, lastname);
    if (!def_res[0]) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({error: def_res[1]});
        return;
    }

    // check that input is valid
    const val_res = are_user_details_valid(username, firstname, lastname);
    if (!val_res[0]) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({error: val_res[1]});
        return;
    }

    db.run(`INSERT INTO user (username, firstname, lastname) VALUES (?, ?, ?)`, [username, firstname, lastname], (err) =>{
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(409).send({error: "A student with the specified username already exists."});
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database"});
            }
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({ "username": username,
                    "firstname": firstname,
                    "lastname": lastname
                });
        }
    });
});

// retrieves data for a user
app.get('/api/user/:id', (req, res) => {
    const { id } = req.params; // extract 'id' from request 
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Invalid id"});
        return
    } 
    db.get(`SELECT username, firstname, lastname FROM user WHERE id=?`, id, (err, row) =>{
        if (err) {
            console.error('Problem while quiring database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database"});
        }
        if (!row) { // true if user not set 
            res.status(404)
                .setHeader('content-type', 'application/json')
                .send({ error: "User not found for id: " + id}); // resourse not found
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({ id: `${id}`, username: `${row.username}`, firstname: `${row.firstname}`,
                    lastname: `${row.lastname}`});
        }
    });
});

// deletes a user
app.delete('/api/user/delete', (req, res) => {
    const id = req.query.id; // look for ?id=... param
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Invalid id"});
        return
    } 
    db.run(`DELETE FROM user WHERE id=?`, [id], (err) => {
        if (err) {
            console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database"});
        } else {
            if (this.changes === 0) {
                res.status(404)
                    .setHeader('content-type', 'application/json')
                    .send({ error: "User not found for id: " + code});
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({ message: "OK"});
            }
        }
    });
});

// updates a user's details
app.put('/api/user/update', (req, res) => {
    const put_user = req.body; // submitted user - picked from body
    const id = put_user.id, username = put_user.username, firstname = put_user.firstname, lastname=put_user.lastname;

    if (typeof(id) != "number") {
        res.status(422) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Invalid id"});
        return
    }

    const val_res = are_user_details_valid(username, firstname, lastname);
    if (!val_res[0]) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({error: val_res[1]});
        return;
    }

    db.get(`SELECT * FROM user WHERE id=?`, id, (err, row) =>{
        if (err) {
            console.error('Problem while quiring database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database"});
            return;
        }
        if (!row) { // true if user not set 
            res.status(404)
                .setHeader('content-type', 'application/json')
                .send({ error: "User not found for id: " + id}); // resourse not found
            return;
        } 

        db.run(`UPDATE user SET username=?, firstname=?, lastname=? WHERE id=?`, [username, firstname, lastname, id], (err) =>{
            if (err) {
                    console.error('Problem while quiring database: ' + err);
                    res.status(500) // internal server error
                        .setHeader('content-type', 'application/json')
                        .send({ error: "Problem while querying database"});
            } else {
                    res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({ message: { id: `${id}`,
                        username: `${username}`,
                        firstname: `${firstname}`,
                        lastname: `${lastname}`}});
            }
        });
    });
});

// lists all users
app.get('/api/user', (req, res) => {
    const eventID = req.query.eventID; // look for ?eventID=... param

    var users = []; // initially, empty array
    if (eventID == undefined) {
        db.all(`SELECT id, username, firstname, lastname FROM user`, (err, rows) => {
            if(err) {
                console.error('Problem while querying database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database"});
                return;
            }
            rows.forEach(row =>
                users.push({ id: `${row.id}`, username: `${row.username}`, firstname: `${row.firstname}`,
                    lastname: `${row.lastname}`}
                ));

            res.status(200)
                .setHeader('content-type', 'application/json')
                .send(users); // body is JSON
        });
    } else {
        if (!isNumeric(eventID) || eventID == "") {
            res.status(422) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Invalid eventID"});
            return;
        }
        db.all(`SELECT user.id, username, firstname, lastname FROM user INNER JOIN reservation ON user.id=reservation.userID WHERE reservation.eventID=?`, [eventID], (err, rows) => {
            if(err) {
                console.error('Problem while querying database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database"});
                return;
            }
            rows.forEach(row =>
                users.push({ id: `${row.id}`, username: `${row.username}`, firstname: `${row.firstname}`,
                    lastname: `${row.lastname}`}
                ));

            res.status(200)
                .setHeader('content-type', 'application/json')
                .send(users); // body is JSON
        });
    }
});

// creates a new event organizer
app.post('/api/organizer/create', (req, res) => {
    const posted_organizer = req.body; // submitted organizer - picked from body
    const name = posted_organizer.name;

    // check that input is defined
    const val_res = is_length_valid(name);
    if (!val_res.status) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({error: val_res.message});
        return;
    }

    db.run(`INSERT INTO organizer (name) VALUES (?)`, [name], (err) =>{
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(409).send({error: "An organizer with the specified name already exists."});
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database"});
            }
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({ "name": name });
        }
    });
});

// creates a new event type
app.post('/api/event-type/create', (req, res) => {
    const posted_event_type = req.body; // submitted event type - picked from body
    const name = posted_event_type.name;

    // check that input is defined
    const val_res = is_length_valid(name);
    if (!val_res.status) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({error: val_res.message});
        return;
    }

    db.run(`INSERT INTO eventType (name) VALUES (?)`, [name], (err) =>{
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(409).send({error: "An event type with the specified name already exists."});
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database"});
            }
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({ "name": name });
        }
    });
});

// lists event types
app.get('/api/event-type', (req, res) => {
    var eventTypes = []; // initially, empty array
    db.all(`SELECT id, name FROM eventType`, (err, rows) => {
        if(err) {
            console.error('Problem while querying database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database"});
            return;
        }
        rows.forEach(row =>
            eventTypes.push({ id: `${row.id}`, name: `${row.name}`}));

        res.status(200)
            .setHeader('content-type', 'application/json')
            .send(eventTypes); // body is JSON
    });
});

// creates a new event
app.post('/api/event/create', (req, res) => {
    const posted_event = req.body; // submitted event - picked from body
    const eventTypeID = posted_event.eventTypeID, organizerID = posted_event.organizerID, name = posted_event.name,
        price = posted_event.price, datetime = posted_event.datetime, locationLatitude = posted_event.locationLatitude,
        locationLongtitude = posted_event.locationLongtitude, maxParticpants = posted_event.maxParticpants;

    // check that input is defined
    const val_res = are_event_parameters_valid(name);
    if (!val_res.status) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({error: val_res.message});
        return;
    }

    db.run(`INSERT INTO organizer (name) VALUES (?)`, [name], (err) =>{
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(409).send({error: "An organizer with the specified name already exists."});
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database"});
            }
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({ "name": name });
        }
    });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
    console.log(`Press Ctrl+C to exit...`)
});