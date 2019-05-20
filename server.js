var WebSocketServer = require('websocket').server
var http = require('http')


var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url)
    response.writeHead(404)
    response.end()
})
server.listen(8080, () => console.log((new Date()) + ' Server is listening on port 8080'))


wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
})


function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}

var connections = []

wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject()
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.')
        return
    }

    var connection = request.accept(acceptedProtocol = null, allowedOrigin = request.origin)
    connections.push(connection)
    console.log((new Date()) + ' Connection accepted.')

    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.')
    })

    lobbyName = null

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.debug('Received Message: ' + message.utf8Data);

            var csRequest = JSON.parse(message.utf8Data)
            var csAnswer = undefined

            if (lobbyName == null) {
                lobbyName = csRequest.body.name

                feedbackClient(connection, undefined, HandleRequest_CreateLobby, csRequest, undefined)

                let lobby = massLobby.find((value) => { return value.Name == lobbyName })
                if (lobby != undefined) {
                    feedbackClient(connection, lobby.socket1, HandleRequest_JoinLobby, csRequest, lobby)
                }
            }
            else {
                let lobby = massLobby.find((value) => { return value.Name == lobbyName })


            }
        }
    })
})



///Обработка запроса клиента с  непосредственным ответом
function feedbackClient(socket1, socket2, requestHandler, requestJSON, lobby) {
    answer = requestHandler(requestJSON, socket1, lobby)
    if (answer != undefined) {
        socket1.sendUTF(answer)
        if (socket2 != undefined) {
            socket2.sendUTF(answer)
        }
        else
            if (lobby != undefined) {
                lobby.Socket1.sendUTF(answer)
            }
    }
}

const fighterWidth = 100.0

const fighterHeight = 150.0

/// Обслуживаемые лобби
var massLobby = []

/// Перечесление статуса лобби
var LobbyStatusEnum = Object.freeze({ "refused": 0, "casting": 1, "fight": 2, "pause": 3, "finished": 4 })


//REGION: ОБРАБОТКА ЗАПРОСОВ КЛИЕНТОВ  

///Обработка запроса на создание лобби
function HandleRequest_CreateLobby(parsed, connection, lobby) {
    if (lobby != undefined) {
        return ApproveStatusJSON(LobbyStatusEnum.refused)
    }

    if (parsed.head.type == 'createLobby') {
        var name = parsed.body.name // Название лобби
        var password = parsed.body.password // Пароль к лобби


        var socket1 = connection
        var socket2 = null

        // Дескриптор бойца 1
        var descriptor1 = {
            x: -130.0,
            y: 0.0,
            isOn: false,
            hp: 100
        }
        // Дескриптор бойца 2
        var descriptor2 = {
            x: 130.0,
            y: 0.0,
            isOn: false,
            hp: 100
        }

        var newLobby = {
            Status: LobbyStatusEnum.casting,
            Name: name,
            Password: password,
            Socket1: socket1,
            Socket2: socket2,
            Descriptor1: descriptor1,
            Descriptor2: descriptor2
        }

        // Записываем в массив наш объект
        massLobby.push(newLobby)
        return ApproveStatusJSON(LobbyStatusEnum.casting)
    }
}


///Обработка запроса на присоединение к лобби
function HandleRequest_JoinLobby(parsed, connection, lobby) {
    if (parsed.head.type == "joinLobby") {
        var password = parsed.body.password

        if (lobby.Password == password) {
            lobby.Socket2 = connection
            lobby.Status = LobbyStatusEnum.fight

            return ApproveStatusJSON(LobbyStatusEnum.fight)
        }
        else {
            return ApproveStatusJSON(LobbyStatusEnum.refused)
        }
    }
}


///Обработка запроса на сдачу
function HandleRequest_Surrender(parsed, lobby) {
    if (parsed.head.type == "surrender") {

    }
}


///Обработка запроса на паузу
function HandleRequest_Pause(parsed, lobby) {
    if (parsed.head.type == "pause") {

    }
}


///Обработка запроса на удар
function HandleRequest_Strike(parsed, lobby) {
    if (parsed.head.type == "strike") {
        var X = parsed.body.x
        var Y = parsed.body.y
        var dx = parsed.body.dx
        var dy = parsed.body.dy
    }
}


///Обработка запроса на горизонтальное перемещение
function HandleRequest_HorizontalMove(parsed, lobby) {
    if (parsed.head.type == "horizontalMove") {
        let from = parsed.body.from
        let by = parsed.body.by



    }
}


///Обработка запроса на блок удара
function HandleRequest_Block(parsed, lobby) {
    if (parsed.head.type == "block") {
        var isOn = parsed.body.isOn
    }
}


//REGION: JSON ОТВЕТЫ КЛИЕНТАМ

function ApproveStatusJSON(statusCode) {
    let answer = {
        head: {
            type: "status"
        },
        body: {
            code: statusCode,
            description: ""
        }
    }
    let json = JSON.stringify(answer)
    return json
}


function ApproveStrikeJSON(strikeAction, endHp) {
    let answer = {
        head: {
            id: action.head.id,
            type: "strikeApprove"
        },
        body: {
            x: action.body.x,
            x: strikeAction.body.x,
            y: strikeAction.body.y,
            dx: strikeAction.body.dx,
            dy: strikeAction.body.dy,
            endHP: endHp
        }
    }
    let json = JSON.stringify(answer)
    return json
}


function ApproveHorizontalMoveJSON(id, from, to) {
    let by = to - from
    let answer = {
        head: {
            id: id,
            type: "horizontalMoveApprove"
        },
        body: {
            from: from,
            to: to,
            by: by
        }
    }
    let json = JSON.stringify(answer)
    return json
}


function ApproveBlockApproveJSON(blockAction, isOn) {
    let answer = {
        head: {
            id: blockAction.head.id,
            type: "blockApprove"
        },
        body: {
            isOn: isOn
        }
    }
    let json = JSON.stringify(answer)
    return json
}