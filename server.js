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
    //Ограничение по ip клиента отсутствует
    return true;
}

var connection_IDAdder = 0

wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject()
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.')
        return
    }

    var connection = request.accept(acceptedProtocol = null, allowedOrigin = request.origin)
    connection.id = connection_IDAdder
    connection_IDAdder += 1

    console.log((new Date()) + ' Connection accepted. Id = ' + connection.id)

    connection.on('close', function (reasonCode, description) {
        removableLobby = massLobby.find((value) => {
            return (value.Socket1.id == connection.id || value.Socket2.id == connection.id)
        })

        if (removableLobby != undefined) {
            if (removableLobby.Socket1 != undefined)
                removableLobby.Socket1.close()

            if (removableLobby.Socket2 != undefined)
                removableLobby.Socket2.close()

            console.log((new Date()) + " Removed lobby: " + removableLobby.Name)
            massLobby = massLobby.filter((value) => { value.Name != removableLobby.Name })
        }
    })

    lobbyName = null
    //потеря соединения одного клиента -- разрыв у второго клиента, удаление лобби
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

                //тестировать
                feedbackClient(lobby.Socket1, lobby.Socket2, HandleRequest_Pause, csRequest, lobby)
                feedbackClient(lobby.Socket1, lobby.Socket2, HandleRequest_Surrender, csRequest, lobby)
                feedbackClient(lobby.Socket1, lobby.Socket2, HandleRequest_Block, csRequest, lobby)
            }
        }
    })
})



///Обработка запроса клиента с  непосредственным ответом
function feedbackClient(socket1, socket2, requestHandler, requestJSON, lobby) {
    answer = requestHandler(requestJSON, socket1, lobby)
    if (answer != undefined) {
        socket1.sendUTF(answer)//оповещение создающего (или подключающегося в исключительном случае)
        if (socket2 != undefined) {
            socket2.sendUTF(answer)//оповещение подключающегося
        }
        else//исключительный случай для подключаещегося (оповещение создающего)
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
        return ComposeAnswer_Status(LobbyStatusEnum.refused)
    }

    if (parsed.head.type == 'createLobby') {
        var name = parsed.body.name // Название лобби
        var password = parsed.body.password // Пароль к лобби

        //Проверка на повтор имени
        let lobby = massLobby.find((value) => { return value.Name == lobbyName })
        if (lobby != undefined) {
            return ComposeAnswer_Status(LobbyStatusEnum.refused)
        }

        var socket1 = connection
        var socket2 = null

        // Дескриптор бойца 1
        var fighter1 = {
            x: -130.0,
            y: 0.0,
            isOn: false,
            hp: 100
        }
        // Дескриптор бойца 2
        var fighter2 = {
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
            Descriptor1: fighter1,
            Descriptor2: fighter2
        }

        // Записываем в массив наш объект
        massLobby.push(newLobby)
        return ComposeAnswer_Status(LobbyStatusEnum.casting)
    }
}


///Обработка запроса на присоединение к лобби
function HandleRequest_JoinLobby(parsed, connection, lobby) {
    if (parsed.head.type == "joinLobby") {
        var password = parsed.body.password

        if (lobby.Password == password) {
            lobby.Socket2 = connection
            lobby.Status = LobbyStatusEnum.fight

            return ComposeAnswer_Status(LobbyStatusEnum.fight)
        }
        else {
            return ComposeAnswer_Status(LobbyStatusEnum.refused)
        }
    }
}


//тестировать
///Обработка запроса на сдачу
function HandleRequest_Surrender(parsed, connection, lobby) {
    if (parsed.head.type == "surrender") {
        if (lobby.Status == LobbyStatusEnum.fight) {
            return ComposeAnswer_Status(LobbyStatusEnum.finished)
        }
    }
}


//тестировать
///Обработка запроса на паузу
function HandleRequest_Pause(parsed, connection, lobby) {
    if (parsed.head.type == "pause") {
        if (lobby.Status == LobbyStatusEnum.fight) {
            setTimeout(() => { return ComposeAnswer_Status(LobbyStatusEnum.fight) }, 30 * 1000000)
            return ComposeAnswer_Status(LobbyStatusEnum.pause)
        }
    }
}


///Обработка запроса на удар
function HandleRequest_Strike(parsed, connection, lobby) {
    if (parsed.head.type == "strike") {
        var X = parsed.body.x
        var Y = parsed.body.y
        var dx = parsed.body.dx
        var dy = parsed.body.dy
    }
}


///Обработка запроса на горизонтальное перемещение
function HandleRequest_HorizontalMove(parsed, connection, lobby) {
    if (parsed.head.type == "horizontalMove") {
        let from = parsed.body.from
        let by = parsed.body.by

        //клиент присылает by, в замен получает to

    }
}


//тестировать
///Обработка запроса на блок удара
function HandleRequest_Block(parsed, connection, lobby) {
    if (parsed.head.type == "block") {
        let fighterID = parsed.type.id
        let isOn = parsed.body.isOn

        if ((fighterID == 0 && lobby.fighter1.isOn != isOn) ||
            (fighterID == 1 && lobby.fighter2.isOn != isOn)) {
            return ComposeAnswer_Block(parsed, isOn)
        }
    }
}


//REGION: JSON ОТВЕТЫ КЛИЕНТАМ

function ComposeAnswer_Status(statusCode) {
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


function ComposeAnswer_Strike(strikeAction, endHp) {
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


function ComposeAnswer_Move(id, from, to) {
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


function ComposeAnswer_Block(blockAction, isOn) {
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