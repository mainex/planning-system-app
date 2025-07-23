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
    db.run(`CREATE TABLE IF NOT EXISTS event(id INTEGER PRIMARY KEY, eventTypeID INTEGER NOT NULL, organizerID INTEGER NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL, datetime INTEGER NOT NULL, locationLatitude REAL NOT NULL, locationLongitude REAL NOT NULL, maxParticipants INTEGER NOT NULL, FOREIGN KEY(eventTypeID) REFERENCES eventType(id), FOREIGN KEY(organizerID) REFERENCES organizer(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS reservation(id INTEGER PRIMARY KEY, eventID INTEGER NOT NULL, userID INTEGER NOT NULL, FOREIGN KEY(eventID) REFERENCES event(id), FOREIGN KEY(userID) REFERENCES user(id), CONSTRAINT UQ_eventID_userID UNIQUE (eventID, userID))`);
});

db.get("PRAGMA foreign_keys = ON");


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

function isAlphaNumericWithSpaces(input) {
    const val = input.trim();
    const RegEx = /^[a-z0-9 ]+$/i;
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
    dateTime, locationLatitude, locationLongitude, maxParticipants) {
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

    if (dateTime == undefined) {
        status = false;
        message += "The datetime must be defined. ";
    }

    if (locationLatitude == undefined) {
        status = false;
        message += "The locationLatitude must be defined. ";
    }

    if (locationLongitude == undefined) {
        status = false;
        message += "The locationLongitude must be defined. ";
    }

    if (maxParticipants == undefined) {
        status = false;
        message += "The maxParticipants must be defined. ";
    }

    if (name == "") {
        status = false;
        message += "The name must be not empty";
    }

    if (!isAlphaNumericWithSpaces(name)) {
        status = false;
        message += "The name must contain only alphanumeric characters and spaces. ";
    }

    if (name.length < 2 || name.length > 255) {
        status = false;
        message += "The name must be between 2-255 characters long. ";
    }

    if (typeof (eventTypeID) != "number") {
        status = false;
        message += "The eventTypeID must be valid integer. "
    }

    if (typeof (organizerID) != "number") {
        status = false;
        message += "The organizerID must be valid integer. "
    }

    if (price <= 0) {
        status = false;
        message += "The price must be a positive real number. "
    }

    if (dateTime <= Date.now() / 1000) {
        status = false;
        message += "The dateTime must be a valid timestamp, and be in the future. "
    }

    if (locationLatitude < -90 || locationLatitude > 90) {
        status = false;
        message += "The locationLatitude must be a valid latitude, between the values -90<=X<=+90. "
    }

    if (locationLongitude < -180 || locationLongitude > 180) {
        status = false;
        message += "The locationLongitude must be a valid longitude, between the values -180<=Y<=180. "
    }

    if (maxParticipants <= 0) {
        status = false;
        message += "The maxParticipants must be a valid non-zero positive integer. "
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
            .send({ error: def_res[1] });
        return;
    }

    // check that input is valid
    const val_res = are_user_details_valid(username, firstname, lastname);
    if (!val_res[0]) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({ error: val_res[1] });
        return;
    }

    db.run(`INSERT INTO user (username, firstname, lastname) VALUES (?, ?, ?)`, [username, firstname, lastname], (err) => {
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(409).send({ error: "A student with the specified username already exists." });
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            }
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({
                    username: username,
                    firstname: firstname,
                    lastname: lastname
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
            .send({ error: "Invalid id" });
        return
    }
    db.get(`SELECT username, firstname, lastname FROM user WHERE id=?`, id, (err, row) => {
        if (err) {
            console.error('Problem while quiring database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database" });
        }
        if (!row) { // true if user not set 
            res.status(404)
                .setHeader('content-type', 'application/json')
                .send({ error: "User not found for id: " + id }); // resourse not found
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({
                    id: `${id}`, username: `${row.username}`, firstname: `${row.firstname}`,
                    lastname: `${row.lastname}`
                });
        }
    });
});

// deletes a user
app.delete('/api/user/delete', (req, res) => {
    const id = req.query.id; // look for ?id=... param
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return
    }
    db.run(`DELETE FROM user WHERE id=?`, [id], (err) => {
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(422).send({ error: "The user is referenced in other entities" });
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            }
        } else {
            if (this.changes === 0) {
                res.status(404)
                    .setHeader('content-type', 'application/json')
                    .send({ error: "User not found for id: " + code });
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({ message: "OK" });
            }
        }
    });
});

// updates a user's details
app.put('/api/user/update', (req, res) => {
    const put_user = req.body; // submitted user - picked from body
    const id = put_user.id, username = put_user.username, firstname = put_user.firstname, lastname = put_user.lastname;

    if (typeof (id) != "number") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return;
    }

    const val_res = are_user_details_valid(username, firstname, lastname);
    if (!val_res[0]) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({ error: val_res[1] });
        return;
    }

    db.get(`SELECT * FROM user WHERE id=?`, id, (err, row) => {
        if (err) {
            console.error('Problem while quiring database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database" });
            return;
        }
        if (!row) { // true if user not set 
            res.status(404)
                .setHeader('content-type', 'application/json')
                .send({ error: "User not found for id: " + id }); // resourse not found
            return;
        }

        db.run(`UPDATE user SET username=?, firstname=?, lastname=? WHERE id=?`, [username, firstname, lastname, id], (err) => {
            if (err) {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({
                        message: {
                            id: `${id}`,
                            username: `${username}`,
                            firstname: `${firstname}`,
                            lastname: `${lastname}`
                        }
                    });
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
            if (err) {
                console.error('Problem while querying database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
                return;
            }
            rows.forEach(row =>
                users.push({
                    id: `${row.id}`, username: `${row.username}`, firstname: `${row.firstname}`,
                    lastname: `${row.lastname}`
                }
                ));

            res.status(200)
                .setHeader('content-type', 'application/json')
                .send(users); // body is JSON
        });
    } else {
        if (!isNumeric(eventID) || eventID == "") {
            res.status(422) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Invalid eventID" });
            return;
        }
        db.all(`SELECT user.id, username, firstname, lastname FROM user INNER JOIN reservation ON user.id=reservation.userID WHERE reservation.eventID=?`, [eventID], (err, rows) => {
            if (err) {
                console.error('Problem while querying database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
                return;
            }
            rows.forEach(row =>
                users.push({
                    id: `${row.id}`, username: `${row.username}`, firstname: `${row.firstname}`,
                    lastname: `${row.lastname}`
                }
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
            .send({ error: val_res.message });
        return;
    }

    db.run(`INSERT INTO organizer (name) VALUES (?)`, [name], (err) => {
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(409).send({ error: "An organizer with the specified name already exists." });
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            }
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({ name: name });
        }
    });
});

// deletes an organizer
app.delete('/api/organizer/delete', (req, res) => {
    const id = req.query.id; // look for ?id=... param
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return
    }
    db.run(`DELETE FROM organizer WHERE id=?`, [id], (err) => {
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(422).send({ error: "The organizer is referenced in other entities" });
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            }
        } else {
            if (this.changes === 0) {
                res.status(404)
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Organizer not found for id: " + code });
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({ message: "OK" });
            }
        }
    });
});

// lists organizers
app.get('/api/organizer', (req, res) => {
    const hasEvents = req.query.hasEvents; // look for ?hasEvents=... param
    var query = `SELECT organizer.id, organizer.name FROM organizer INNER JOIN event ON organizer.id=event.organizerID`;
    if (!hasEvents) {
        query = `SELECT id, name FROM organizer`;
    }
    var organizers = []; // initially, empty array
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Problem while querying database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database" });
            return;
        }
        rows.forEach(row =>
            organizers.push({ id: `${row.id}`, name: `${row.name}` }));

        res.status(200)
            .setHeader('content-type', 'application/json')
            .send(organizers); // body is JSON
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
            .send({ error: val_res.message });
        return;
    }

    db.run(`INSERT INTO eventType (name) VALUES (?)`, [name], (err) => {
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(409).send({ error: "An event type with the specified name already exists." });
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            }
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({ name: name });
        }
    });
});

// deletes an event type
app.delete('/api/event-type/delete', (req, res) => {
    const id = req.query.id; // look for ?id=... param
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return
    }
    db.run(`DELETE FROM eventType WHERE id=?`, [id], (err) => {
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(422).send({ error: "The event type is referenced in other entities" });
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            }
        } else {
            if (this.changes === 0) {
                res.status(404)
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Event type not found for id: " + code });
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({ message: "OK" });
            }
        }
    });
});


// lists event types
app.get('/api/event-type', (req, res) => {
    var eventTypes = []; // initially, empty array
    db.all(`SELECT id, name FROM eventType`, (err, rows) => {
        if (err) {
            console.error('Problem while querying database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database" });
            return;
        }
        rows.forEach(row =>
            eventTypes.push({ id: `${row.id}`, name: `${row.name}` }));

        res.status(200)
            .setHeader('content-type', 'application/json')
            .send(eventTypes); // body is JSON
    });
});

// creates a new event
app.post('/api/event/create', (req, res) => {
    const posted_event = req.body; // submitted event - picked from body
    const eventTypeID = posted_event.eventTypeID, organizerID = posted_event.organizerID, name = posted_event.name,
        price = posted_event.price, dateTime = posted_event.dateTime, locationLatitude = posted_event.locationLatitude,
        locationLongitude = posted_event.locationLongitude, maxParticipants = posted_event.maxParticipants;

    // check that input is defined
    const val_res = are_event_parameters_valid(eventTypeID, organizerID, name, price,
        dateTime, locationLatitude, locationLongitude, maxParticipants);
    if (!val_res.status) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({ error: val_res.message });
        return;
    }

    db.run(`INSERT INTO event (eventTypeID, organizerID, name, price, datetime, locationLatitude, locationLongitude, maxParticipants) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [eventTypeID, organizerID, name, price, dateTime, locationLatitude, locationLongitude, maxParticipants], (err) => {
            if (err) {
                if (err.code == 'SQLITE_CONSTRAINT') {
                    res.status(422).send({ error: "All IDs must exist in the database. " });
                } else {
                    console.error('Problem while quiring database: ' + err);
                    res.status(500) // internal server error
                        .setHeader('content-type', 'application/json')
                        .send({ error: "Problem while querying database" });
                }
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({
                        eventTypeID: eventTypeID,
                        organizerID: organizerID,
                        name: name,
                        price: price,
                        dateTime: dateTime,
                        locationLatitude: locationLatitude,
                        locationLongitude: locationLongitude,
                        maxParticipants: maxParticipants
                    });
            }
        });
});

// deletes an event
app.delete('/api/event/delete', (req, res) => {
    const id = req.query.id; // look for ?id=... param
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return
    }
    db.run(`DELETE FROM event WHERE id=?`, [id], (err) => {
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                res.status(422).send({ error: "The event is referenced in other entities" });
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            }
        } else {
            if (this.changes === 0) {
                res.status(404)
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Event type not found for id: " + code });
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({ message: "OK" });
            }
        }
    });
});

// retrieves data for an event
app.get('/api/event/:id', (req, res) => {
    const { id } = req.params; // extract 'id' from request 
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return
    }

    db.get(`SELECT eventTypeID, organizerID, name, price, datetime, locationLatitude, locationLongitude, maxParticipants FROM event WHERE id=?`, id, (err, row) => {
        if (err) {
            console.error('Problem while quiring database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database" });
        }
        if (!row) { // true if event not set 
            res.status(404)
                .setHeader('content-type', 'application/json')
                .send({ error: "Event not found for id: " + id }); // resourse not found
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({
                    id: `${id}`,
                    eventTypeID: `${row.eventTypeID}`,
                    organizerID: `${row.organizerID}`,
                    name: `${row.name}`,
                    price: `${row.price}`,
                    datetime: `${row.datetime}`,
                    locationLatitude: `${row.locationLatitude}`,
                    locationLongitude: `${row.locationLongitude}`,
                    maxParticipants: `${row.maxParticipants}`
                });
        }
    });
});

// updates an event's details
app.put('/api/event/update', (req, res) => {
    const put_event = req.body; // submitted user - picked from body
    const id = put_event.id, eventTypeID = put_event.eventTypeID, organizerID = put_event.organizerID, name = put_event.name, price = put_event.price, datetime = put_event.dateTime, locationLatitude = put_event.locationLatitude, locationLongitude = put_event.locationLongitude, maxParticipants = put_event.maxParticipants;

    if (typeof (id) != "number") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return;
    }

    const val_res = are_event_parameters_valid(eventTypeID, organizerID, name, price, datetime, locationLatitude, locationLongitude, maxParticipants);
    if (!val_res.status) {
        res.status(422)
            .setHeader('content-type', 'application/json')
            .send({ error: val_res.message });
        return;
    }

    db.get(`SELECT * FROM event WHERE id=?`, id, (err, row) => {
        if (err) {
            console.error('Problem while quiring database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database" });
            return;
        }
        if (!row) { // true if user not set 
            res.status(404)
                .setHeader('content-type', 'application/json')
                .send({ error: "Event not found for id: " + id }); // resourse not found
            return;
        }

        db.run(`UPDATE event SET eventTypeID=?, organizerID=?, name=?, price=?, datetime=?, locationLatitude=?, locationLongitude=?, maxParticipants=? WHERE id=?`, [eventTypeID, organizerID, name, price, datetime, locationLatitude, locationLongitude, maxParticipants, id], (err) => {
            if (err) {
                console.log("HERE");
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({
                        message: {
                            id: `${id}`,
                            eventTypeID: `${eventTypeID}`,
                            organizerID: `${organizerID}`,
                            name: `${name}`,
                            price: `${price}`,
                            datetime: `${datetime}`,
                            locationLatitude: `${locationLatitude}`,
                            locationLongitude: `${locationLongitude}`,
                            maxParticipants: `${maxParticipants}`
                        }
                    });
            }
        });
    });
});

// creates a new reservation
app.post('/api/reservation/create', (req, res) => {
    const posted_reservation = req.body; // submitted reservation - picked from body
    const eventID = posted_reservation.eventID, userID = posted_reservation.userID;

    var maxParticipants;
    db.get(`SELECT * FROM event WHERE id=?`, [eventID], (err, row) => {
        if (err) {
            console.error('Problem while quiring database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database" });
        } else {
            if (!row) { // true if event not set 
                res.status(404)
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Event not found for id: " + eventID }); // resourse not found
            } else {
                maxParticipants = row.maxParticipants;
                db.all(`SELECT * FROM reservation WHERE eventID=?`, [eventID], (err, rows) => {
                    if (err) {
                        console.error('Problem while quiring database: ' + err);
                        res.status(500) // internal server error
                            .setHeader('content-type', 'application/json')
                            .send({ error: "Problem while querying database" });
                    } else {
                        if (rows && rows.length >= maxParticipants) {
                            res.status(422)
                                .setHeader('content-type', 'application/json')
                                .send({ error: "There aren't enough slots available to make the reservation. " });
                        } else {
                            db.all(`INSERT INTO reservation (eventID, userID) VALUES (?, ?)`, [eventID, userID], (err) => {
                                if (err) {
                                    if (err.code == 'SQLITE_CONSTRAINT') {
                                        res.status(404)
                                            .send({ error: "User not found for id: " + userID + ", or this user already has a reservation for this event." });
                                    } else {
                                        console.error('Problem while quiring database: ' + err);
                                        res.status(500) // internal server error
                                            .setHeader('content-type', 'application/json')
                                            .send({ error: "Problem while querying database" });
                                    }
                                } else {
                                    res.status(200)
                                        .setHeader('content-type', 'application/json')
                                        .send({
                                            userID: userID,
                                            eventID: eventID
                                        });
                                }
                            });
                        }
                    }
                });
            }
        }
    });
});

// retrieves data for a reservations
app.get('/api/reservation/:id', (req, res) => {
    const { id } = req.params; // extract 'id' from request 
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return
    }
    db.get(`SELECT eventID, userID FROM reservation WHERE id=?`, id, (err, row) => {
        if (err) {
            console.error('Problem while quiring database: ' + err);
            res.status(500) // internal server error
                .setHeader('content-type', 'application/json')
                .send({ error: "Problem while querying database" });
        }
        if (!row) { // true if user not set 
            res.status(404)
                .setHeader('content-type', 'application/json')
                .send({ error: "Reservation not found for id: " + id }); // resourse not found
        } else {
            res.status(200)
                .setHeader('content-type', 'application/json')
                .send({
                    id: `${id}`,
                    userID: `${row.userID}`,
                    eventID: `${row.eventID}`
                });
        }
    });
});

// deletes a reservation
app.delete('/api/reservation/delete', (req, res) => {
    const id = req.query.id; // look for ?id=... param
    if (!isNumeric(id) || id == "") {
        res.status(422) // internal server error
            .setHeader('content-type', 'application/json')
            .send({ error: "Invalid id" });
        return
    }
    db.run(`DELETE FROM reservation WHERE id=?`, [id], (err) => {
        if (err) {
            if (err.code == 'SQLITE_CONSTRAINT') {
                console.err(err);
                res.status(422).send({ error: "The reservation is referenced in other entities" });
            } else {
                console.error('Problem while quiring database: ' + err);
                res.status(500) // internal server error
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Problem while querying database" });
            }
        } else {
            if (this.changes === 0) {
                res.status(404)
                    .setHeader('content-type', 'application/json')
                    .send({ error: "Reservation not found for id: " + code });
            } else {
                res.status(200)
                    .setHeader('content-type', 'application/json')
                    .send({ message: "OK" });
            }
        }
    });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
    console.log(`Press Ctrl+C to exit...`)
});