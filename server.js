var WebSocketServer = require('websocket').server
var http = require('http')


//REGION: HTTP SERVER
var server = http.createServer(function (request, response) {
    console.debug((new Date()) + ' | Received request for ' + request.url)
    response.writeHead(404)
    response.end()
})
server.listen(8080, () => console.debug((new Date()) + ' | Server is listening on port 8080'))

//REGION: WS SERVER
wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
})

function originIsAllowed(origin) {
    //Ограничение по ip клиента отсутствует
    return true
}

//REGION: LOBBY/CONNECTION
///UID подключения
var connection_IDAdder = 0

///Полное удаление лобби
function wipeOffLobby(removableLobby) {
    if (removableLobby != undefined) {
        if (removableLobby.Socket1 != undefined)
            removableLobby.Socket1.close()

        if (removableLobby.Socket2 != undefined)
            removableLobby.Socket2.close()

        console.debug((new Date()) + " | Removed lobby: " + removableLobby.Name)
        massLobby = massLobby.filter((value) => { value.Name != removableLobby.Name })
    }
}


//Поиск лобби по id сокета (connection)
function lobbyWithConnection(id) {
    let lobby = massLobby.find((value) => {
        if (value.Socket1 != undefined)
            if (value.Socket1.id == id)
                return true

        if (value.Socket2 != undefined)
            if (value.Socket2.id == id)
                return true

        return false
    })
    return lobby
}


//Поиск лобби по id сокета (connection)
function lobbyWithCorruption() {
    let lobby = massLobby.find((value) => {
        if (value.Socket1 == undefined)
            return true

        return false
    })
    return lobby
}


///Поиск сокета клиента по лобби и id бойца
function fighterSocket(lobby, fighterID) {
    if (fighterID == 0) {
        return lobby.Socket1
    }
    else {
        return lobby.Socket2
    }
}
//ПРОВЕРКА 

///Логика обработки входящих запросов на подключение
wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject()
        console.debug((new Date()) + ' | Connection from origin ' + request.origin + ' rejected.')
        return
    }

    var connection = request.accept(acceptedProtocol = null, allowedOrigin = request.origin)
    connection.id = connection_IDAdder
    connection_IDAdder += 1

    console.debug((new Date()) + ' | Connection accepted. Id = ' + connection.id)

    ///Логика обработки закрытия соединения;потеря соединения одного клиента -- разрыв у второго клиента, удаление лобби
    connection.on('close', function (reasonCode, description) {
        let corruptedLobby = lobbyWithCorruption()
        wipeOffLobby(corruptedLobby)

        let removableLobby = lobbyWithConnection(connection.id)
        wipeOffLobby(removableLobby)
    })

    lobbyName = null

    ///Логика обработки входящих сообщений
    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.debug(new Date() + ' | Received Message: ' + message.utf8Data)

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
                feedbackClient(lobby.Socket1, lobby.Socket2, HandleRequest_HorizontalMove, csRequest, lobby)
                feedbackClient(lobby.Socket1, lobby.Socket2, HandleRequest_Strike, csRequest, lobby)
                feedbackClient(lobby.Socket1, lobby.Socket2, HandleRequest_Block, csRequest, lobby)
                feedbackClient(lobby.Socket1, lobby.Socket2, HandleRequest_Status, csRequest, lobby)

                //листинг лобби
                printLobbyStatus(lobby)
            }
        }
    })
})


///Скрипт обработки запроса клиента с  непосредственным ответом
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
                console.debug(new Date() + ' | Sent Message: ' + answer)
            }
    }
}


///Вывести основные сведения о лобби
function printLobbyStatus(lobby) {
    console.debug(new Date() + " | STATUS")
    console.debug("LOBBY name = " + lobby.Name + ";password = " + lobby.Password + ";status = " + lobby.Status)
    console.debug("fighter1 x = " + lobby.Fighter1.x + ";isBlock = " + lobby.Fighter1.isOn + ";hp = " + lobby.Fighter1.hp)
    console.debug("fighter2 x = " + lobby.Fighter2.x + ";isBlock = " + lobby.Fighter2.isOn + ";hp = " + lobby.Fighter2.hp)
}


/// Обслуживаемые лобби
var massLobby = []

/// Перечесление статуса лобби
const LobbyStatusEnum = Object.freeze({ "refused": 0, "casting": 1, "fight": 2, "pause": 3, "over": 4, "surrender": 5 })


//REGION: ОБРАБОТКА ЗАПРОСОВ СОЕДИНЕНИЯ 

///Занимаемое пространство моделью бойца по ширине на сцене
const fighterWidth = 100.00006

function halfFighterWidth() {
    return fighterWidth / 2
}
///Занимаемое пространство моделью бойца по высоте на сцене
const fighterHeight = 128.91574

///Координата левой границы сцены
const sceneLeftBorder = -333.5

///Координата правой границы сцены
const sceneRightBorder = 333.5


///Возвращает дескриптор бойца по его id и lobby
function fighterDescriptor(id, lobby) {
    if (id == 0) {
        return lobby.Fighter1
    }
    else {
        return lobby.Fighter2
    }
}

///Обработка запроса на создание лобби
function HandleRequest_CreateLobby(parsed, connection, lobby) {
    if (parsed.head.type == 'createLobby') {
        var name = parsed.body.name // Название лобби
        var password = parsed.body.password // Пароль к лобби
        let nickname = parsed.body.nickname

        //Проверка на повтор имени
        let lobby = massLobby.find((value) => { return value.Name == lobbyName })
        if (lobby != undefined) {
            return ComposeAnswer_Status(LobbyStatusEnum.refused)
        }

        var socket1 = connection
        var socket2 = null

        // Дескриптор бойца 1
        var fighter1 = {
            id: 0,
            x: -130.0,
            y: 0.0,
            isOn: false,
            hp: 100,
            nickname: nickname
        }
        // Дескриптор бойца 2
        var fighter2 = {
            id: 1,
            x: 130.0,
            y: 0.0,
            isOn: false,
            hp: 100,
            nickname: undefined
        }

        var newLobby = {
            Status: LobbyStatusEnum.casting,
            Name: name,
            Password: password,
            Socket1: socket1,
            Socket2: socket2,
            Fighter1: fighter1,
            Fighter2: fighter2
        }

        console.debug("!!! В созданное лобби socket1 = " + newLobby.Socket1.id)

        // Записываем в массив наш объект
        massLobby.push(newLobby)
        return ComposeAnswer_Status(LobbyStatusEnum.casting)
    }
}


///Обработка запроса на присоединение к лобби
function HandleRequest_JoinLobby(parsed, connection, lobby) {
    if (parsed.head.type == "joinLobby") {
        var password = parsed.body.password
        let nickname = parsed.body.nickname

        if (lobby.Password == password) {
            lobby.Socket2 = connection
            lobby.Fighter2.nickname = nickname
            
            console.debug("!!! В созданное лобби socket2 = " + lobby.Socket2.id)
            lobby.Status = LobbyStatusEnum.fight

            return ComposeAnswer_Status(LobbyStatusEnum.fight)
        }
        else {
            return ComposeAnswer_Status(LobbyStatusEnum.refused)
        }
    }
}


//REGION: ОБРАБОТКА ЗАПРОСОВ СТАТУСА


function HandleRequest_Status(parsed, connection, lobby) {
    if (parsed.head.type == "status") {
        let code = parsed.body.code

        switch (code) {
            case 3:
                return HandleRequest_Pause(parsed, connection, lobby)
            case 5:
                return HandleRequest_Surrender(parsed, connection, lobby)
            default:
                return undefined
        }
    }
}

//увеличить паузу
///Обработка запроса на паузу
function HandleRequest_Pause(parsed, connection, lobby) {
    if (lobby.Status == LobbyStatusEnum.fight) {
        lobby.Status = LobbyStatusEnum.pause

        setTimeout(() => {
            lobby.Status = LobbyStatusEnum.fight
            let answer = ComposeAnswer_Status(LobbyStatusEnum.fight)

            if (lobby != undefined) {
                if (lobby.Socket1 != undefined) {
                    lobby.Socket1.sendUTF(answer)//оповещение создавшего
                    console.debug(new Date() + ' | Sent Message: ' + answer)
                }
                if (lobby.Socket2 != undefined) {
                    lobby.Socket2.sendUTF(answer)//оповещение подключившегося
                    console.debug(new Date() + ' | Sent Message: ' + answer)
                }
            }
        }, 5 * 1000)

        return ComposeAnswer_Status(LobbyStatusEnum.pause)
    }
}


///Обработка запроса на сдачу
function HandleRequest_Surrender(parsed, connection, lobby) {
    if (lobby.Status == LobbyStatusEnum.fight) {
        lobby.Status = LobbyStatusEnum.surrender

        setTimeout(wipeOffLobby, 10 * 1000, lobby)

        return ComposeAnswer_Status(LobbyStatusEnum.over)
    }
}


//REGION: ОБРАБОТКА ЗАПРОСОВ УДАРА

const StrikeDirectionEnum = Object.freeze({ "up": 0, "straight": 1, "down": 2 })

///Определение расстояния между атакующим и защищающимся
///fighterSender -- кто бьет
///fighterReciever -- кого бьют
///directionView -- направление взгляда атакующего
function calculateStrikeDistance(fighterSender, fighterReciever, directionView) {
    var distance = undefined

    //проверка на совпадение взгляда и получающего удар
    //(проверить баг при коллизии моделей, может быть рассинхрон когда sk сам передвинет модели бойцов)
    if (directionView == 0) {
        let senderLeftX = fighterSender.x - halfFighterWidth()
        let recieverRightX = fighterReciever.x + halfFighterWidth()
        //тот кто бьет должен быть справа
        if (senderLeftX > recieverRightX) {
            distance = senderLeftX - recieverRightX
        }
    }
    else {
        let senderRightX = fighterSender.x + halfFighterWidth()
        let recieverLeftX = fighterReciever.x - halfFighterWidth()
        //тот кто бьет должен быть слева
        if (senderRightX < recieverLeftX) {
            distance = recieverLeftX - senderRightX
        }
    }

    return distance
}


///Высчитывает вектор удара
function calculateStrikeVector(fighterReciever, directionView, directionStrike) {
    let vectorStartPoint_X = fighterReciever.x
    var vectorStartPoint_Y = undefined

    var vectorEndPoint_X = 1
    if (directionView == 0) {
        vectorEndPoint_X = -1
    }

    var vectorEndPoint_Y = undefined
    switch (directionStrike) {
        case 0://up
            vectorEndPoint_Y = 1
            vectorStartPoint_Y = fighterHeight
            break
        case 1://straight
            vectorEndPoint_Y = 0
            vectorStartPoint_Y = fighterHeight / 2
            break
        case 2://down
            vectorEndPoint_Y = -1
            vectorStartPoint_Y = 0
            break
    }

    let startPoint = { x: vectorStartPoint_X, y: vectorStartPoint_Y }
    let endPoint = { x: vectorEndPoint_X, y: vectorEndPoint_Y }
    return { startPoint: startPoint, endPoint: endPoint }
}


///Обработка удара по его характеристикам
///fighterSender -- кто бьет
///fighterReciever -- кого бьют
///directionView -- направление взгляда атакующего
///directionStrike -- направление удара по вертикали
///strikeRange -- максимальная дистанция удара
///strikeStrength -- максимальная сила удара
function processStrike(fighterSender, fighterReciever, impact, directionView, directionStrike, maxStrikeRange, maxStrikeStrength) {
    if (fighterReciever.hp > 0) {
        //расстояние между атакующим и защищающимся
        let distance = calculateStrikeDistance(fighterSender, fighterReciever, directionView)

        //вектор удара
        let vector = calculateStrikeVector(fighterReciever, directionView, directionStrike)

        //остаточное hp
        var endHp = fighterReciever.hp

        if (distance != undefined && distance <= maxStrikeRange) {
            if (!fighterReciever.isOn) {//блок уменьшает урон
                endHp -= maxStrikeStrength
            } else {
                endHp -= maxStrikeStrength / 2
            }
        }

        fighterReciever.hp = endHp

        return ComposeAnswer_Strike(fighterSender.id, impact, vector.startPoint, vector.endPoint, endHp)
    }
    else {
        return ComposeAnswer_Status(LobbyStatusEnum.over)
    }
}


///Обработка запроса на удар
function HandleRequest_Strike(parsed, connection, lobby) {
    if (parsed.head.type == "strike") {
        let id = parsed.head.id
        let directionView = parsed.body.direction

        var fSender = lobby.Fighter1
        var fReciever = lobby.Fighter2
        if (id == 1) {
            fSender = lobby.Fighter2
            fReciever = lobby.Fighter1
        }

        let impact = parsed.body.impact

        switch (impact) {
            case 0:
                //удар рукой
                return processStrike(fSender, fReciever, impact, directionView, StrikeDirectionEnum.up, 100, 5)
            case 1:
                //удар левой ногой вверх
                return processStrike(fSender, fReciever, impact, directionView, StrikeDirectionEnum.up, 100, 10)
            case 2:
                //удар правой ногой прямо
                return processStrike(fSender, fReciever, impact, directionView, StrikeDirectionEnum.straight, 150, 5)
        }
    }
}


//REGION: ОБРАБОТКА ЗАПРОСОВ ПЕРЕДВИЖЕНИЯ


///Дескриптор, описывающий границы бойца
function getFighterBordersDescriptor(centerX) {
    let halfW = halfFighterWidth()

    let leftX = centerX - halfW
    let rightX = centerX + halfW
    let descriptor = {
        centerX: centerX,
        leftX: leftX,
        rightX: rightX
    }

    return descriptor
}


///Ограничение координат бойца сценой
function constrainFighterInScene(X, byX) {
    var finalX = X + byX
    FleftX = X - halfFighterWidth()
    FrightX = X + halfFighterWidth()

    if (FleftX + byX < sceneLeftBorder) {
        finalX = sceneLeftBorder + halfFighterWidth()
    }
    if (FrightX + byX > sceneRightBorder) {
        finalX = sceneRightBorder - halfFighterWidth()
    }

    return finalX
}

///Ограничение координат бойцов
function constrainFighterBeyoundOpponent(movingFighterDescriptor,by,stayingFighterDescriptor) {

}


///Обработка запроса на горизонтальное перемещениеж;клиент присылает by, в замен получает to
function HandleRequest_HorizontalMove(parsed, connection, lobby) {
    if (parsed.head.type == "horizontalMove") {
        let by = parsed.body.by
        let fighterID = parsed.head.id

        let movingFD = fighterDescriptor(fighterID, lobby)
        var stayingFD = undefined

        if (fighterID == 0){
            stayingFD = fighterDescriptor(1,lobby)
        }else{
            stayingFD = fighterDescriptor(0,lobby)
        }

        let stayingFighterBordersDescriptor = getFighterBordersDescriptor(stayingFD.x)

        let startMovingX = movingFD.x
        let movingFighterBordersDescriptor = getFighterBordersDescriptor(startMovingX)

        //блокировка перехлеста бойцов
        constrainFighterBeyoundOpponent(movingFighterDescriptor,by,stayingFighterBordersDescriptor)

        let finalX = constrainFighterInScene(startMovingX, by)
        FD.startMovingX = finalX

        return ComposeAnswer_Move(parsed.head.id, startMovingX, finalX)
    }
}


//REGION: ОБРАБОТКА ЗАПРОСОВ БЛОКА

//тестировать
///Обработка запроса на блок удара
function HandleRequest_Block(parsed, connection, lobby) {
    if (parsed.head.type == "block") {
        let fighterID = parsed.head.id
        let isOn = parsed.body.isOn

        let FDescriptor = fighterDescriptor(fighterID, lobby)

        if (FDescriptor.isOn != isOn) {
            FDescriptor.isOn = isOn
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
            description: "",
            nickname1: "",
            nickname2: ""
        }
    }
    let json = JSON.stringify(answer)
    return json
}



function ComposeAnswer_Strike(FighterRecieverID, impact, vectorStartPoint, vectorEndPoint, endHp) {
    let answer = {
        head: {
            id: FighterRecieverID,
            type: "strikeApprove"
        },
        body: {
            x: vectorStartPoint.x,
            y: vectorStartPoint.y,
            dx: vectorEndPoint.x,
            dy: vectorEndPoint.y,
            impact: impact,
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


//тестировать
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