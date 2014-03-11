var express = require('express');
var app = express();

app.set('view engine', 'jade');

app.get('/', function(req, res) {
    res.sendfile('index.html');
});

app.get(/^\/((?:js|css|img|public)\/.+)$/, function(req, res) {
    console.log('static file request');
    res.sendfile(req.params);
});

app.get(/^\/room\/(.+)$/, function(req, res) {
    console.log('request to get in room', req.params);
    res.render('room.jade', {roomname: req.params});
});

app.get(/^\/class$/, function(req, res) {
    console.log('request to join random group chat');
    res.render('class.jade');
});

var server = require('http').createServer(app).listen(80);

var roomtable = {};
var guesttable = {};
var classroom = {};
var maxClients = 4;
var maxClassMember = 6;
var stuPerRoom = 3;
var io = require('socket.io').listen(server);
io.sockets.on('connection', function(client) {
    client.on('onboard home page', function(name) {
	console.log('client onboard home page!');
	guesttable[name] = 'connected';
	var roominfo = {};
	for (var key in roomtable) {
	    if (roomtable[key]) {
		console.log(key);
		roominfo[key] = roomtable[key].length - 1;
	    }
	}
	client.emit('room info', roominfo);
    });
    
    function randtalk(student_list) {
	var i;
	function fisherYates(list) {
	    var posi = list.length - 1, p;
	    var temp;
	    
	    if (posi === 0 || list === undefined)
		return []; //shoude throw an err
	    for (;posi >= 0; posi -= 1) {
		p = Math.floor(Math.random() * posi);
		temp = list[posi];
		list[posi] = list[p];
		list[p] = temp;
	    }
	    return list;
	}
	student_list = fisherYates(student_list);
	
	for (i in student_list) {
	    student_list[i].emit('goto room', 'ChatGroup0' + (i % stuPerRoom + 1), maxClassMember);
	}
    }

    client.on('onboard class room', function(room) {
	room = 'foo';
	if (!classroom[room]) 
	    classroom[room] = [];
	classroom[room].push(client);
	console.log(client.id, "joined classroom.");
	for (var i in classroom[room]) {
	    classroom[room][i].emit('class room info', classroom[room].length, maxClassMember);
	}

	if (classroom[room].length === maxClassMember) {
	    randtalk(classroom[room]);
	    classroom[room] = undefined;
	    console.log('class cleared', classroom[room]);
	}
    });

    function log(){
	var array = [">>> Message from server: "];
	for (var i = 0; i < arguments.length; i++) {
	    array.push(arguments[i]);
	}
	client.emit('log', array);
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

    //room broadcast, arg: a list of room member
    client.on('broadcast', function(type, message) {
	console.log('Transporting board message: ',  message);
	for(var i = 1; i < roomtable[client.room].length; i++)
	    roomtable[client.room][i].emit('broadcast', client.id, type, message);
    });

    client.on('message', function (message) {
	console.log('Send Message, from : ', client.id);
	console.log('                to :  ALL');
	console.log('               msg : ', message);
	if (message === 'bye') {
	    if (!roomtable[client.room]) return;
	    var i = roomtable[client.room].indexOf(client);
	    roomtable[client.room].splice(i,1);
	    if (roomtable[client.room].length >= 2) {
		updateIndex();
	    } else {
		roomtable[client.room] = undefined;
		console.log(client.room, 'cleard');
		return;
	    }
	}
	
	for (var i = 1; i < roomtable[client.room].length; i++) {
	    roomtable[client.room][i].emit('message', client.id, message);
	}
    });
    
    client.on('messageTo', function (to, message) {
	console.log('Send Message, from : ', client.id);
	console.log('                to : ', to);
	console.log('               msg : ', message);
	for (var i = 1; i < roomtable[client.room].length; i++) {
	    if(roomtable[client.room][i].id !== to) continue;
	    roomtable[client.room][i].emit('messageFrom', client.id, message);
	}
    });

    client.on('create or join', function (room, name, initColor) {
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
	client['name'] = name;
	updateIndex();

	log('Room ' + room + ' has ' + numClients + ' client(s)');
	log('Request to create or join room', room);
	
	if (numClients == 0){
	    client.join(room);
	    roomtable[room].initColor = initColor;
	    client.emit('created', room);
	} else if (numClients <= roomtable[room][0] - 1) {
	    var namehash = {};
	    for (var i = 1; i <= numClients; i++) {
		roomtable[room][i].emit('join', client.id, client.name);
		namehash[roomtable[room][i].id] = roomtable[room][i].name;
	    }
	    client.join(room);
	    client.emit('joined', room, namehash, roomtable[room].initColor);
	} else { // max: rootable[room][0] clients
	    client.emit('full', room);
	}
    });
});
