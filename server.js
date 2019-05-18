var WebSocketServer = require('websocket').server
var http = require('http')


var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url)
    response.writeHead(404)
    response.end()
})
server.listen(1337, () => console.log((new Date()) + ' Server is listening on port 1337'))


wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
})


function originIsAllowed(origin) {
    // put logic here to detect whether the specified origin is allowed.
    return true;
}


connection.on('close', function (reasonCode, description) {
    console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.')
})


wsServer.on('request', function (request) {
    if (!originIsAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject()
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.')
        return
    }

    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.')

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.debug('Received Message: ' + message.utf8Data);

            var csAnswer = null
            var csRequest = JSON.parse(message.utf8Data)

            csAnswer = HandleRequest_CreateLobby(csRequest, connection)
            csAnswer = HandleRequest_JoinLobby(csRequest, connection)



            if (csAnswer != null) {
                connection.sendUTF(csAnswer)
            }
        }
    })
})


 /// Обслуживаемые лобби
 var massLobby = []

 /// Перечесление статуса лобби
 var LobbyStatusEnum = Object.freeze({ "refused": 0, "casting": 1, "fight": 2, "pause": 3, "finished": 4 })


 //REGION: ОБРАБОТКА ЗАПРОСОВ КЛИЕНТОВ  

 ///Обработка запроса на создание лобби
 function HandleRequest_CreateLobby(parsed, connection) {
     if (parsed.head.type == 'createLobby') {
         var name = parsed.body.name // Название лобби
         var password = parsed.body.password // Пароль к лобби

         var Lobby = massLobby.find((v) => { v.Name == name })
         if (Lobby == undefined) {
             var socket1 = connection
             var socket2 = null

             // Дескриптор бойца 1
             var descriptor1 = {
                 x: 30.0,
                 y: 0.0,
                 isOn: false,
                 hp: 100
             }
             // Дескриптор бойца 2
             var descriptor2 = {
                 x: 30.0,
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
             //Отправить статус игры "refused"

         }
         else {
             //Отправить статус игры "casting"

         }
     }
 }


 ///Обработка запроса на присоединение к лобби
 function HandleRequest_JoinLobby(parsed, connection) {
     if (parsed.head.type == "joinLobby") {
         var name = parsed.body.name
         var password = parsed.body.password

         var Lobby = massLobby.find((v) => { v.Name == name })

         if (Lobby != undefined && Lobby.Password == password) {
             Lobby.Socket2 = connection
             Lobby.Status = LobbyStatusEnum.fight
         }
     }
 }


 ///Обработка запроса на сдачу
 function HandleRequest_Surrender(parsed) {
     if (parsed.head.type == "surrender") {

     }
 }


 ///Обработка запроса на паузу
 function HandleRequest_Pause(parsed) {
     if (parsed.head.type == "pause") {

     }
 }


 ///Обработка запроса на удар
 function HandleRequest_Strike(parsed) {
     if (parsed.head.type == "strike") {
         var X = parsed.body.x
         var Y = parsed.body.y
         var dx = parsed.body.dx
         var dy = parsed.body.dy
     }
 }


 ///Обработка запроса на горизонтальное перемещение
 function HandleRequest_HorizontalMove(parsed) {
     if (parsed.head.type == "horizontalMove") {
         var from = parsed.body.from
         var to = parsed.body.to
         var by = parsed.body.by
     }
 }


 ///Обработка запроса на блок удара
 function HandleRequest_Block(parsed) {
     if (parsed.head.type == "block") {
         var isOn = parsed.body.isOn
     }
 }




