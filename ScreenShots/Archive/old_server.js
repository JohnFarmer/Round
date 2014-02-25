var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
	file.serve(req, res);
    }).listen(2013);

var roomtable = {};
var maxClients = 3;
var io = require('socket.io').listen(app);
io.sockets.on('connection', function (client){
        
	
	function log(){
	    var array = [">>> Message from server: "];
	    for (var i = 0; i < arguments.length; i++) {
		array.push(arguments[i]);
	    }
	    client.emit('log', array);
	}

	//room broadcast, arg: a list of room member
	function roombc(room) {
	    var array = [">>> Room Broadcast(From "+client.id.substring(0,3)+"): "];
	    for(var i = 1; i < arguments.length; i++)
		array.push(arguments[i]);
	    for(var i = 1; i < room.length; i++)
		room[i].emit('log', array);
	}

	//room index
	function updateIndex() {
	    for (var i = 1; i < roomtable[client.room].length; i++) {
		roomtable[client.room][i].emit('index', i);
	    }
	}

	client.on('message', function (message) {
		if(message.from)
		    log('Got message: ', message, message.from);
		else
		    log('Got message: ', message);
		if (message === 'bye') {
		    var index = roomtable[client.room].indexOf(client);
		    roomtable[client.room].splice(index,1);
		    if (roomtable[client.room].length >= 2) {
			updateIndex();
		    } else {
			roomtable[client.room] = undefined;
			return;
		    }
		}
		for (var i = 1; i < roomtable[client.room].length; i++) {
		    roomtable[client.room][i].emit('message', message);
		}
	    });
	
	client.on('messageto', function (message) {
		
	    });

	client.on('create or join', function (room) {
		log("Your ID is " + client.id.substring(0,3));
		var numClients;
		if (!roomtable[room]) {
		    numClients = 0;
		    roomtable[room] = [];
		    roomtable[room][0] = maxClients; 
		    // roomtable[room][0] reserved for max clients and etc.
		    roomtable[room].push(client);
		} else {
		    numClients = roomtable[room].length - 1;
		    roomtable[room].push(client);
		}
		client['room'] = room;
		updateIndex();
		//var numClients = io.sockets.clients(room).length;
		
		log('Room ' + room + ' has ' + numClients + ' client(s)');
		log('Request to create or join room', room);
				roombc(roomtable[room], client.id + ' joined room ' + room);

		if (numClients == 0){
		    client.join(room);
		    client.emit('created', room);
		} else if (numClients <= roomtable[room][0] - 1) {
		    io.sockets.in(room).emit('join', room);
		    client.join(room);
		    client.emit('joined', room);
		} else { // max: rootable[room][0] clients
		    client.emit('full', room);
		}
		client.emit('emit(): client ' + client.id + ' joined room ' + room);
		client.broadcast.emit('broadcast(): client ' + client.id + ' joined room ' + room);

	    });
    });