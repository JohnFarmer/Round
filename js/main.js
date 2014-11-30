/*var $ = (function() {
  var d = document;
  return {
  doc : d,
  id : d.getElementById.bind(d),
  crt : d.createElement.bind(d)
  };
  })();*/
// a local connect info module
var peerConns = {};
var peerIndex;
var peerId = null;
var peerColorScheme = {};

var idTable = []; // content start from 1
var idHash = {};
var nameHash = {};

var localStream;
var isChannelReady;

// a tag name config module
var localMediaTag = 'localMedia';
var remoteMediaDivTag = 'remoteMedia';
var boardTag = 'board';
var localMedia = document.getElementById(localMediaTag);
var remoteMediaDiv = document.getElementById(remoteMediaDivTag);
var board = document.getElementById(boardTag);
var inputBox = document.getElementById('inputbox');
var smsSendBtn = document.getElementById('sendbtn');

// a constrain module
var constrains = {video: false, audio: true};
var pc_config = {'iceServers': [{'url': 'stun:10.205.12.113:3478'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};
var sdpConstraints = {'mandatory': {
	'OfferToReceiveAudio':true,
	'OfferToReceiveVideo':true }};

var room = room;
if (room === '') {
	//room = prompt('Enter room name:');
	room = 'foo';
}
document.getElementById('roomname').innerText = room;
var peerName = 'Lucky' + Math.floor(Math.random() * 1000);
peerColorScheme['init'] = '#ABCDEF';

////////////////////////////
// setting connection to signaling server
var socket = io.connect(location.origin,
						{'sync disconnect on unload': true}
					   );
///////
// room config
if (room !== '') {
	console.log('Create or join room', room);
	var config = { name: peerName,
				   initColor: peerColorScheme['init'] };
	socket.emit('create or join', room, config);
}

socket.on('created', function(room) {
	peerColorScheme['wheel'] = mkColorWheel(peerColorScheme['init']);
	handlePageColor();
	handleLocalColor();
	console.log('Created room ' + room);
});

socket.on('full', function(room) {
	console.log('Room ' + room + ' is full');
	alert('Room ' + room + ' is full');
});

socket.on('join', function(from, name) {
	console.log('Another peer', from, name, 'made a request to join room ');
	nameHash[from] = name;
	isChannelReady = true;
});

socket.on('joined', function(room, namehash, initColor) {
	console.log('initColor', initColor);
	peerColorScheme['wheel'] = mkColorWheel(initColor);
	handlePageColor();
	handleLocalColor();
	console.log('Self Color Wheel inited by peer 1', peerColorScheme['wheel']);
	console.log('This peer has joined room ' + room);
	nameHash = namehash;
	isChannelReady = true;
});

socket.on('log', function(array) {
	console.log.apply(console, array);
});

socket.on('boardmsg', function(from, type, message) {
	console.log('Receving board message:', message);
	if (type === 'sms') {
		var historyMsg = board.innerText;
		board.innerText =
			(from === peerId? 'Me' : nameHash[from]) +
			' : ' + message + '\n' + historyMsg;
	}
});

smsSendBtn.onclick = function() {
	var sms = inputBox.value;
	console.log('Sending board messgae:', sms);
	socket.emit('boardmsg', 'sms', sms);
	inputBox.value = '';
};
//////////////
/// message sending & recieving
function sendMessage(to, message) {
	console.log('Client sending message to ' + to + ': ', message);
	// if (typeof message === 'object') {
	// message = JSON.stringify(message);
	// }
	socket.emit('message', to, message);
}

socket.on('index', function (index, idtable) {
	peerIndex = index;
	if (!peerId) {
		peerId = idtable[index];
		console.log('This Peer\'s Id: ', idtable[index]);
	}
	idTable = idtable;
	idHash = {};
	for (var i = 1; i <= idtable[0]; i++)
		idHash[idtable[i]] = i;
	for (var i = 1; i <= idtable[0]; i++)
		if(peerConns[idtable[i]])
			peerConns[idtable[i]].updateBoxIndex();
	console.log('>>> Update peer index:', peerIndex);
	console.log('    id table: ', idtable.toString());
	for (var i = 1; i <= idTable[0]; i++) {
		if (peerConns[idTable[i]] && peerConns[idTable[i]].placeHolder) {
			console.log('peer',i,'reporting');
			peerConns[idTable[i]].handleColor();
		}
	}
	handleLocalColor();
});

var handleMessage = function(from, message) {
	if (from === peerId) return;
	console.log('Recived message from:', from, 'msg:', message);
	if (message === 'got user media') {
		if (!peerConns[from]) {
			console.log('new PC OBJ in posi I');
			peerConns[from] = new PeerConnection(from); }
		peerConns[from].maybeStart();
		return;
	} else if (message === 'bye') {
		peerConns[from].handleRemoteHangup();
		delete peerConns[from];
		return;
	}

	var pc = peerConns[from];
	console.log('Client received message from (' +
				from + '):', message);

	try {
		if (pc) {
			if (message.type === 'answer') {
				pc.peerConn.setRemoteDescription(
					new RTCSessionDescription(message));
			} else if (message.type === 'candidate') {
				var candidate = new RTCIceCandidate({
					sdpMLineIndex: message.label,
					candidate: message.candidate
				});
				console.log(pc.peerConn);
				console.log(pc);
				pc.peerConn.addIceCandidate(candidate);
			}
		}
		if (message.type === 'offer') {
			if (!peerConns[from]) {
				console.log('new PC OBJ in posi II');
				peerConns[from] = new PeerConnection(from);}
			pc.maybeStart();
			pc.peerConn.setRemoteDescription(
				new RTCSessionDescription(message));
			pc.doAnswer();
		}
	} catch (e) {
		console.log('Error from messageFrom event:', e.message);
		// setTimeout can not block the proccess, find another way
		////////////////////
		// setTimeout(handleMessageFrom(from, message), 2000);
		////////////////////
		pc.messageCache.push(message);
		console.log('MessageCache: got cache message');
	}
};

socket.on('message', handleMessage);


///////////////////////////
/// setting local stream

function recover() {
	// console.log('starting to recover');
	var pc;
	for (var i = 1; i <= idTable[0]; i++) {
		if (peerIndex === i) continue;
		console.log(peerConns[idTable[i]].messageCache);
		if (peerConns[idTable[i]].messageCache !== []) {
			pc = peerConns[idTable[i]];
			console.log('trying to recover: peer', i, idTable[i]);
			for (var j in pc.messageCache) {
				handleMessageFrom(idTable[i], pc.messageCache[j]);
			}
		}
	}
}

function handleUserMedia(stream) {
	console.log('Adding local stream.');
	setTimeout(recover, 30);
	localMedia.src = window.URL.createObjectURL(stream);
	localStream = stream;
	localMedia.muted = true;
	sendMessage('all', 'got user media');
	for (var i = 1; i < peerIndex; i++) {
		if(!peerConns[idTable[i]]) {
			console.log('new PC OBJ in posi III');
			peerConns[idTable[i]] = new PeerConnection(idTable[i]); }
		peerConns[idTable[i]].maybeStart();
	}
}

function handleUserMediaError(error){
	console.log('navigator.getUserMedia error: ', error);
}

//navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
navigator.getUserMedia(constrains, handleUserMedia, handleUserMediaError);

console.log('Getting user media with constrains', constrains);

// TODO: set TURN server

/////////////////////////////////
/// this is a peer agent deal with peer connection and media stream
function PeerConnection(connectedPeer) {
	console.log('Create PeerConnection Object with', connectedPeer);
	var self = this;
	this.peerConn;
	this.connectedPeerID;
	this.isStarted;
	this.remoteStream;
	this.div;
	this.media;
	this.placeHolder;
	this.connectedWith = connectedPeer;
	this.messageCache = [];

	////////////////////////////
	// create html media tag
	this.createTag = function () {
		var tagType;
		if (constrains.video) {
			tagType = 'video';
		} else if (constrains.audio) {
			tagType = 'audio';
		} else { /*  */	}

		this.div = document.createElement('div');
		this.div.setAttribute('class','box');
		remoteMediaDiv.appendChild(this.div);
		this.updateBoxIndex();

		this.placeHolder = document.createElement('div');
		this.placeHolder.setAttribute('class', 'placeholder');

		this.media = document.createElement(tagType);
		this.media.autoplay = true;
		//this.media.controls = true; // placeholder
		this.placeHolder.innerText =
			idHash[this.connectedWith] + ': ' + nameHash[this.connectedWith];

		this.div.appendChild(this.placeHolder);
		this.div.appendChild(this.media);
		this.handleColor();
	};

	this.updateBoxIndex = function() {
		this.div.setAttribute('id', idHash[this.connectedWith]);
		this.div.setAttribute('style',
							  'order: ' +
							  ((p = idHash[this.connectedWith] - peerIndex) > 0 ?
							   p : p + idTable.length) + ';');
		if(this.placeHolder)
			this.placeHolder.innerText =
			idHash[this.connectedWith] + ': ' + nameHash[this.connectedWith];
	};

	this.handleColor = function() {
		console.log('it works!');
		this.placeHolder.style.backgroundColor =
			peerColorScheme['wheel'][idHash[this.connectedWith] * 2];
	};

	//////////////////////////
	// peer connection operations
	this.createPeerConnection = function() {
		try {
			//this.peerConn = new webkitRTCPeerConnection(pc_config);
			this.peerConn = new RTCPeerConnection(pc_config);
			this.peerConn.onicecandidate = this.handleIceCandidate;
			this.peerConn.onaddstream = this.handleRemoteStreamAdded;
			this.peerConn.onremoveStream = this.handleRemoteStreamRemoved;
			console.log('Created RTCPeerConnection Object');
		} catch (e) {
			console.log('Failed to create PeerConnection Object');
			console.log('With exception: ' + e.message);
		}

	};

	this.handleRemoteStreamAdded = function(event) {
		console.log('Remote stream added.');
		self.createTag();
		self.media.src = window.URL.createObjectURL(event.stream);
		self.remoteStream = event.stream;
	};

	this.handleIceCandidate = function(event) {
		console.log('handleIceCandidate event: ', event);
		if (event.candidate) {
			sendMessage(self.connectedWith, {
				type: 'candidate',
				label: event.candidate.sdpMLineIndex,
				id: event.candidate.sdpMid,
				candidate: event.candidate.candidate});
		} else {
			console.log('End of candidates.');
			this.connected = true;
		}
	};

	this.handleCreateOfferError = function(event){
		console.log('createOffer() error: ', e);
	};

	this.doCall = function() {
		console.log('Sending offer to peer:', this.connectedWith);
		this.peerConn.createOffer(this.setLocalAndSendMessage, this.handleCreateOfferError);
	};

	this.doAnswer = function() {
		console.log('Sending answer to peer:', this.connectedWith);
		this.peerConn.createAnswer(this.setLocalAndSendMessage, null, sdpConstraints);
	};

	this.setLocalAndSendMessage = function(sessionDescription) {
		// Set Opus as the preferred codec in SDP if Opus is present.
		sessionDescription.sdp = preferOpus(sessionDescription.sdp);
		self.peerConn.setLocalDescription(sessionDescription);
		console.log('setLocalAndSendMessage sending message' , sessionDescription);
		sendMessage(self.connectedWith, sessionDescription);
	};

	this.handleRemoteStreamRemoved = function(event) {
		console.log('Remote stream removed. Event: ', event);
	};

	this.maybeStart = function() {
		console.log('Calling maybeStart');
		if (!this.isStarted &&
			typeof localStream != 'undefined' &&
			isChannelReady) {
			console.log('ready to createPeerConnection');
			this.createPeerConnection();
			this.peerConn.addStream(localStream);
			this.isStarted = true;
			console.log(peerIndex, idHash[this.connectedWith]);
			if (peerIndex > idHash[this.connectedWith]) {
				console.log('Prepare to call peer:', this.connectedWith);
				this.doCall();
			}
		} else {
			console.log('fail to createPeerConnection');
		}
	};

	//this function exec after recieving a 'bye' message
	this.handleRemoteHangup = function() {
		console.log('Session with',self.connectedWith,'terminated.');
		self.peerConn.close();
		//remove media tag
		remoteMediaDiv.removeChild(self.div);
	};

	function preferOpus(sdp) {
		var sdpLines = sdp.split('\r\n');
		var mLineIndex;
		// Search for m line.
		for (var i = 0; i < sdpLines.length; i++) {
			if (sdpLines[i].search('m=audio') !== -1) {
				mLineIndex = i;
				break;
			}
		}
		if (mLineIndex === null) {
			return sdp;
		}

		// If Opus is available, set it as the default in m line.
		for (i = 0; i < sdpLines.length; i++) {
			if (sdpLines[i].search('opus/48000') !== -1) {
				var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
				if (opusPayload) {
					sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
				}
				break;
			}
		}

		// Remove CN in m line and sdp.
		sdpLines = removeCN(sdpLines, mLineIndex);

		sdp = sdpLines.join('\r\n');
		return sdp;
	}

	function extractSdp(sdpLine, pattern) {
		var result = sdpLine.match(pattern);
		return result && result.length === 2 ? result[1] : null;
	}

	function setDefaultCodec(mLine, payload) {
		var elements = mLine.split(' ');
		var newLine = [];
		var index = 0;
		for (var i = 0; i < elements.length; i++) {
			if (index === 3) { // Format of media starts from the fourth.
				newLine[index++] = payload; // Put target payload to the first.
			}
			if (elements[i] !== payload) {
				newLine[index++] = elements[i];
			}
		}
		return newLine.join(' ');
	}

	// Strip CN from sdp before CN constrains is ready.
	function removeCN(sdpLines, mLineIndex) {
		var mLineElements = sdpLines[mLineIndex].split(' ');
		// Scan from end for the convenience of removing an item.
		for (var i = sdpLines.length-1; i >= 0; i--) {
			var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
			if (payload) {
				var cnPos = mLineElements.indexOf(payload);
				if (cnPos !== -1) {
					// Remove CN payload from m line.
					mLineElements.splice(cnPos, 1);
				}
				// Remove CN line in sdp
				sdpLines.splice(i, 1);
			}
		}

		sdpLines[mLineIndex] = mLineElements.join(' ');
		return sdpLines;
	}
}

window.onbeforeunload = function(e){
	socket.emit('bye', peerId);
};
