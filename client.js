#!/usr/bin/env node
var WebSocketClient = require('websocket').client

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on("line", (input) => {
    var words = input.split(" ")

    if (words[0] == "move") {
        let id = words[1] * 1
        let by = words[2] * 1
        requestHorizontalMove(_connection, id, by)
    }
    else
        if (words[0] == "strike") {
            let id = words[1] * 1
            let direction = words[2] * 1
            let impact = words[3] * 1
            requestStrike(_connection, id, direction, impact)
        }
        else
            if (words[0] == "create") {
                requestCreateLobby(_connection)
            }
            else
                if (words[0] == "join") {
                    requestJoinLobby(_connection)
                }

})


var client = new WebSocketClient()
var _connection = null

client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString())
})

client.on('connect', function (connection) {
    _connection = connection

    console.log('WebSocket Client Connected')
    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString())
    })
    connection.on('close', function () {
        console.log('echo-protocol Connection Closed')
        _connection = null
    })
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'")
        }
    })

    function sendNumber() {
        if (connection.connected) {
            var number = Math.round(Math.random() * 0xFFFFFF);
            connection.sendUTF(number.toString());
            setTimeout(sendNumber, 1000);
        }
    }
    //sendNumber();
})


function requestJoinLobby(connection) {

    var request = {
        head: {
            id: 1,
            type: "joinLobby"
        },
        body: {
            name: "test",
            password: "228"
        }
    }


    var query = JSON.stringify(request)
    console.debug("Sent: " + query)
    connection.sendUTF(query)
}


function requestCreateLobby(connection) {

    var request = {
        head: {
            id: 0,
            type: "createLobby"
        },
        body: {
            name: "test",
            password: "228"
        }
    }


    var query = JSON.stringify(request)
    console.debug("Sent: " + query)
    connection.sendUTF(query)
}


function requestHorizontalMove(connection, id, by) {

    var request = {
        head: {
            id: id,
            type: "horizontalMove"
        },
        body: {
            from: 0.0,
            to: 0.0,
            by: by
        }
    }


    var query = JSON.stringify(request)
    console.debug("Sent: " + query)
    connection.sendUTF(query)
}


function requestStrike(connection, id, direction, impact) {

    var request = {
        head: {
            id: id,
            type: "strike"
        },
        body: {
            direction: direction,
            impact: impact
        }
    }


    var query = JSON.stringify(request)
    console.debug("Sent: " + query)
    connection.sendUTF(query)
}


client.connect('ws://127.0.0.1:8080/', null)

