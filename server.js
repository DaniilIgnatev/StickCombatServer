#!/usr/bin/env node
var WebSocketServer = require('websocket').server
var http = require('http')
var fs = require('fs')

var cars = []
var customers = []
var purchases = [] 

cars = JSON.parse(fs.readFileSync("cars.json"))
customers = JSON.parse(fs.readFileSync("customers.json"))
purchases = JSON.parse(fs.readFileSync("purchases.json"))

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url)
    response.writeHead(404)
    response.end()
})
server.listen(8080, () =>console.log((new Date()) + ' Server is listening on port 8080'))

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
            HandleDelivery(parsed)
            HandlePurchase(parsed)
            var answer = HandleSelect(parsed)

            if (answer != undefined){
                connection.sendUTF(answer)
            }
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes')
            connection.sendBytes(message.binaryData)
        }

       

    })

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

