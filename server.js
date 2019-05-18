#!/usr/bin/env node
var WebSocketServer = require('websocket').server
var http = require('http')
//var fs = require('fs')

//var cars = []
//var customers = []
//var purchases = [] 



//cars = JSON.parse(fs.readFileSync("cars.json"))
//customers = JSON.parse(fs.readFileSync("customers.json"))
//purchases = JSON.parse(fs.readFileSync("purchases.json"))

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url)
    response.writeHead(404)
    response.end()
})
server.listen(1337, () =>console.log((new Date()) + ' Server is listening on port 1337'))

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
})

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject()
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.')
      return
    }
    
    var connection = request.accept('echo-protocol', request.origin);
    console.log((new Date()) + ' Connection accepted.')
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            //connection.sendUTF(message.utf8Data);
            var parsed = JSON.parse(message.utf8Data)
            HandleCreateLobby(parsed, connection)
            HandleJoinLobby(parsed, connection)
            //HandleDelivery(parsed)
            //HandlePurchase(parsed)
            var answer = Lobby.Status

            if (answer != undefined){
                connection.sendUTF(answer)
            }
        }
    })
    
    /// Массив лобби
    var massLobby = []

    /// Перечесление статуса лобби
    var LobbyStatusEnum = Object.freeze({"casting":1, "fight":2, "pause":3, "finished":4})

    /// Создание лобби
    function HandleCreateLobby(parsed, connection) 
    {
        if (parsed.head.type == 'createLobby')
        {
            var name = parsed.body.name // Название лобби
            var password = parsed.body.password // Пароль к лобби
            var isOn = false // Состояние блока
            var hp = 100 // Жизнь игрока
            var socket1 = connection
            var socket2 = null       

            // Дескриптор бойца 1
            var descriptor1 = { 
                descriptor1:x = 30.0,
                descriptor1:y = 0.0,
                descriptor1:isOn,
                descriptor1:hp
            }
            // Дескриптор бойца 2
            var descriptor2 = {
                descriptor2:x = 330.0,
                descriptor2:y = 0.0,
                descriptor2:isOn,
                descriptor2:hp
            }

            var newLobby = {
                Status: LobbyStatusEnum.casting,
                Name: name, 
                Password: password,
                IsOn: isOn,
                HP: hp,
                Socket1: socket1,
                Socket2: socket2,
                Descriptor1: descriptor1,
                Descriptor2: descriptor2
            }

            // Записываем в массив наш объект
            massLobby.push(newLobby)  
        }       
    }

    /// Присоединение к лобби
    function HandleJoinLobby(parsed, connection)
    {
        if (parsed.head.type == "joinLobby")
        {
            var name = parsed.body.name
            var password = parsed.body.password
            
            var Lobby = massLobby.find( (v) => {v.Name == name} )

            if (Lobby != undefined && Lobby.Password == password)
            {
                Lobby.Socket2 = connection
                Lobby.Status = LobbyStatusEnum.fight
            }
        }
    }

    /// Статус лобби
    function HandleStatusLobby(parsed)
    {
        if (parsed.head.type == "status")
        {
            var type = HandleJoinLobby.Lobby.Status
            var code = null
        }
    }

    /// Статус действия
    function HandleStatusAction(parsed)
    {

        if (parsed.head.type == "surrender") // сдаться
        {

        }

        if (parsed.head.type == "pause") // пауза
        {

        }
    }

    /// Игровое действие 
    function HandleGameAction(parsed) 
    {
        if (parsed.head.type == "strike")
        {
            var X = parsed.body.x
            var Y = parsed.body.y
            var dx = parsed.body.dx
            var dy = parsed.body.dy
            var endHP = body.body.endHP
        }

        if (parsed.head.type == "horizontalMove")
        {
            var from = parsed.body.from
            var to = parsed.body.to   
            var by = parsed.body.by
        }

        if (parsed.head.type == "block")
        {
            var isOn = true
        }
    }
    
      /// Удар  ответ сервера
      function HandleStrike(parsed)
      {
          if (parsed.head.type == "strikeApprove")
          {
              
          }
      }










    function HandleDelivery(parsed){
        if (parsed.type == 'delivery'){
        var car = parsed.car
        car.ID = cars.length
        car.customerID = -1
        cars.push(car)
        console.debug(car)
        }
    }

    function HandlePurchase(parsed){
        if (parsed.type == 'purchase'){
            var customer = parsed.person
            if (!customers.includes(customer)){
                customers.push(customer)
            }

            var cusID = customers.indexOf(customer)

            var purchase = {
                carID: parsed.carID,
                customerID: cusID,
                date: parsed.date
            }
            var car = cars[purchase.carID]
            car.customerID = cusID
            purchases.push(purchase)
        }

    }

    function HandleSelect(parsed){
        if (parsed.type == 'select'){
            switch (parsed.array){
                case 'cars':
                    return JSON.stringify(cars)
                case 'customers':
                    return JSON.stringify(customers)
                case 'purchases':
                    return JSON.stringify(purchases)
                default: 
                    break;
            }
        }
    }

    connection.on('close', function(reasonCode, description) {
        fs.writeFileSync("cars.json", JSON.stringify(cars))
        fs.writeFileSync("customers.json", JSON.stringify(customers))
        fs.writeFileSync("purchases.json", JSON.stringify(purchases))
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.')
    })
})

