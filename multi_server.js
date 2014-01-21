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
	    var idtable = [];
	    idtable.push(roomtable[client.room].length - 1);
	    for (var i = 1; i < roomtable[client.room].length; i++) {
		idtable.push(roomtable[client.room][i].id);
	    }
	    for (var i = 1; i < roomtable[client.room].length; i++) {
		roomtable[client.room][i].emit('index', i, idtable);
	    }
	}

	client.on('message', function (message) {
		if (message === 'bye') {
		    var i = roomtable[client.room].indexOf(client);
		    roomtable[client.room].splice(i,1);
		    if (roomtable[client.room].length >= 2) {
			updateIndex();
		    } else {
			roomtable[client.room] = undefined;
			return;
		    }
		}
		
		for (var i = 1; i < roomtable[client.room].length; i++) {
		    roomtable[client.room][i].emit('message', client.id, message);
		}
	    });
	
	client.on('messageTo', function (to, message) {
		for (var i = 1; i < roomtable[client.room].length; i++) {
		    if(roomtable[client.room][i].id !== to) continue;
		    roomtable[client.room][i].emit('messageFrom', client.id, message);
		}
	    });

	client.on('create or join', function (room) {
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
		
		log('Room ' + room + ' has ' + numClients + ' client(s)');
		log('Request to create or join room', room);
		roombc(roomtable[room], client.id + ' joined room ' + room);

		if (numClients == 0){
		    client.join(room);
		    client.emit('created', room);
		} else if (numClients <= roomtable[room][0] - 1) {
		    for (var i = 1; i < roomtable[room].length; i++)
			roomtable[room][i].emit('join', client.id, room);
		    client.join(room);
		    client.emit('joined', room);
		} else { // max: rootable[room][0] clients
		    client.emit('full', room);
		}
		client.emit('emit(): client ' + client.id + ' joined room ' + room);
		client.broadcast.emit('broadcast(): client ' + client.id + ' joined room ' + room);
	    });
    });