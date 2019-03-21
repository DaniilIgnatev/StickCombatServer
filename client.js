#!/usr/bin/env node
var WebSocketClient = require('websocket').client

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on("line", (input)=>{
    var words = input.split(" ")
    if (words[0] == "delivery"){
        let model = words[1]
        let color = words[2]
        let year = words[3]
        let price = words[4]

        if (_connection != null){
            requestDelivery(_connection,model,color,year,price)
        }
    }
    else
    if (words[0] == "purchase"){
        let carid = words[1]
        let fio = words[2]
        let passport = words[3]
        let method = words[4]

        if (_connection != null){
            requestPurchase(_connection,carid,fio,passport,method)
        }
    }
    else
    if (words[0] == "select"){
        let array = words[1]

        if (_connection != null){
            requestSelect(_connection,array)
        }
    }
})


var client = new WebSocketClient()
var _connection = null

client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString())
})

client.on('connect', function(connection) {
    _connection = connection

    console.log('WebSocket Client Connected')
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString())
    })
    connection.on('close', function() {
        console.log('echo-protocol Connection Closed')
        _connection = null
    })
    connection.on('message', function(message) {
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

function requestDelivery(connection,model,color,year,price){
    
    var car = { 
        model : model,
        color : color,
        year : year,
        price : price
    }

    var request = {
        type : "delivery",
        car : car
    }
    

    var query = JSON.stringify(request)
    console.debug("Sent: " + query)
    connection.sendUTF(query)
}

function requestPurchase(connection,carID,fio,passport,paymentMethod){

    var request = {
        type : "purchase",
        carID : carID,
        person : {
            FIO : fio,
            passport : passport,
            paymentMethod : paymentMethod
        },
        date : Date()
    }

    var query = JSON.stringify(request)
    console.debug("Sent: " + query)
    connection.sendUTF(query)
}

function requestSelect(connection,array){

    var request = {
        type : "select",
        array : array
    }

    var query = JSON.stringify(request)
    console.debug("Sent: " + query)
    connection.sendUTF(query)
}

client.connect('ws://95.104.217.68:8080/', 'echo-protocol')