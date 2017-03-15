const SerialPort = require("serialport");
let com;
let socket;
let status;
let workingMethod;

function newColor(r, g, b) {
    if (!socket) return;
    socket.emit('color', {
        r,
        g,
        b
    })
}

function newMessage(message) {
    if (!socket) return;
    socket.emit('message', {
        message
    })
}

function updateAngles(angles) {
    if (!socket) return;
    socket.emit('angles', {
        angles
    })
}

function portClosed() {
    if (!socket) return;
    socket.emit('portClosed', {});
}

function portError(error) {
    if (!socket) return;
    socket.emit('portError', {
        error
    })
}

function start() {
    if (!com) {
        portClosed();
        return;
    }
    com.write([0xFF, 0x01, 0xFE]);
}

function reset() {
    if (!com) {
        portClosed();
        return;
    }
    com.write([0xFF, 0x00, 0xFE]);
}

function saveWorkingMethod(_workingMethod) {
    if (!com) {
        portClosed();
        return;
    }
    workingMethod = _workingMethod;
    switch (workingMethod) {
        case 'COLOR_BASED':
            com.write([0xFF, 0x02, 0xFE]);
            break;
        case 'GIVEN_POSITION':
            com.write([0xFF, 0x03, 0xFE]);
            break;
        case 'DIRECT_ANGLE':
            com.write([0xFF, 0x06, 0xFE]);
            break;
    }
}

function saveObjects(objects) {
    if (workingMethod === "COLOR_BASED") {
        newMessage('Incorrect format for color sorting');
        return;
    }

    let packet = [];
    objects.forEach(function(record) {
        packet = [0xFF, 0x04];
        record.forEach(function(value) {
            packet.push(Number(value) + 128);
        });
        packet.push(0xFE);
        com.write(packet);
    });
}

function saveAngles(angles) {

    let packet = [];
    packet = [0xFF, 0x07];
    angles.forEach(function(value) {
        packet.push(Number(value));
    });
    packet.push(0xFE);
    com.write(packet);
}

function inputData(data) {
    if (data == '') return;

    let code = data.substr(0, 3);

    if (code == 'COL') {
        let colors = data.substr(3).split(',');
        newColor(colors[0], colors[1], colors[2]);
    } else if (code == 'ANG') {
        let angles = data.substr(3).split(',');
        updateAngles(angles);
    } else if (code == 'MSG') {
        let message = data.substr(3);
        newMessage(message);
    }
}

function comConnect(comName) {
    console.log('Connecting to ' + comName);
    com = new SerialPort(comName, {
        baudRate: 9600,
        parser: SerialPort.parsers.readline('\n')
    }, function(err) {
        if (err) {
            return console.log('Error: ', err.message);
        }
        console.log('Connected.');
    });
    com.on('data', function(data) {
        inputData(data.trim());
    });

    com.on('error', function(error) {
        portError(error);
    })

    com.on('close', function() {
        portClosed();
    });
}

SerialPort.list((err, ports) => {
    status = 'disconnected';
    console.log('Listed COM ports:');
    if (err)
        throw Error(err);

    ports.forEach(port => {
        console.log(port.comName, port.manufacturer ? port.manufacturer : '-');

        if (port.manufacturer && port.manufacturer.substr(0, 7) == 'Arduino') {
            comConnect(port.comName);
            status = 'connected';
        }
    });
});

let express = require('express');
let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);


app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/styles', express.static(__dirname + '/styles/'));
app.use('/js', express.static(__dirname + '/js/'));
app.use('/fonts', express.static(__dirname + '/fonts/'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/status', function(req, res) {
    res.send(status);
})

io.on('connection', function(socketConnected) {
    socket = socketConnected;

    socket.on('start', function() {
        start();
    });

    socket.on('reset', function() {
        reset();
    });

    socket.on('saveObjects', function(objects) {
        saveObjects(objects);
    });

    socket.on('saveAngles', function(angles) {
        saveAngles(angles);
    });

    socket.on('saveWorkingMethodInfo', function(workingMethod) {
        saveWorkingMethod(workingMethod);
    });

    socket.on('saveContainers', function(containers) {
        saveContainers(containers);
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
