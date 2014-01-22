var peerConns = {};
var peerIndex;
var peerId = null;
var idTable;
var idHash;
var localStream;
var standingBy = false;
var isChannelReady;

var localMediaTag = 'localAudio';
var remoteMediaDivTag = 'remoteAudios';
var localMedia = document.getElementById(localMediaTag);
var remoteMediaDiv = document.getElementById(remoteMediaDivTag);

var constraints = {video: false, audio: true};
var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]}
var sdpConstraints = {'mandatory': {
	'OfferToReceiveAudio':true,
	'OfferToReceiveVideo':true }};

var room = location.search.substring(1);
if (room === '') {
    //  room = prompt('Enter room name:');
    room = 'foo';
} else {
    //
}

////////////////////////////
// setting connection to signaling server
var socket = io.connect();
///////
// room config
if (room !== '') {
    console.log('Create or join room', room);
    socket.emit('create or join', room);
}

socket.on('created', function (room){
	console.log('Created room ' + room);
    });

socket.on('full', function (room){
	console.log('Room ' + room + ' is full');
	alert('Room ' + room + ' is full');
    });

socket.on('join', function (from, room){
	console.log('Another peer',from,'made a request to join room ' + room);
	isChannelReady = true;
    });

socket.on('joined', function (room){
	console.log('This peer has joined room ' + room);
	isChannelReady = true;
    });

socket.on('log', function (array){
	console.log.apply(console, array);
    });

//////////////
/// message sending & recieving
function sendMessage(message){
    console.log('Client sending broadcast message: ', message);
    // if (typeof message === 'object') {
    //   message = JSON.stringify(message);
    // }
    socket.emit('message', message);
}

function sendMessageTo(to, message) {
    console.log('Client sending message to ' + idHash[to] + '(' + to + '): ', message);
    socket.emit('messageTo', to, message);
}

socket.on('index', function (index, idtable) {
	peerIndex = index;
	if (!peerId) { 
	    peerId = idtable[index];
	    console.log('This Peer\'s Id: ', idtable[index]);
	}
	idTable = idtable;
	idHash = {};
	for (var i = 1; i <= idtable[0]; i++) idHash[idtable[i]] = i;
	console.log('>>> Update peer index:', peerIndex);
	console.log('    id table: ', idtable.toString());
    });

socket.on('message', function(from, message) {
	if(from === peerId) return;
	console.log('Client received message from (' + from + '):', message);
	if (message === 'got user media') {
	    if (!peerConns[from]) 	
		peerConns[from] = new PeerConnection(from);
	    peerConns[from].maybeStart();
	} else if (message === 'bye') {
		peerConns[from].handleRemoteHangup();
		delete peerConns[from];
	}
    });

var handleMessageFrom = function(from, message) {
    console.log('Client received message from (' + from + '):', message);
    try {
	if (pc = peerConns[from]) { 
	    if (message.type === 'answer') {
		pc.peerConn.setRemoteDescription(new RTCSessionDescription(message));
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
	    if (!peerConns[from])
		peerConns[from] = new PeerConnection(from);
	    var pc = peerConns[from];
	    pc.maybeStart();
	    pc.peerConn.setRemoteDescription(new RTCSessionDescription(message));
	    pc.doAnswer();
	}
    } catch (e) {
	console.log('Error from messageFrom event:', e.message);
	setTimeout(handleMessageFrom(from, message), 500);
    }
	
}
    
socket.on('messageFrom', handleMessageFrom);


///////////////////////////
/// setting local stream

function handleUserMedia(stream) {
    console.log('Adding local stream.');
    localMedia.src = window.URL.createObjectURL(stream);
    localStream = stream;
    sendMessage('got user media');
    for (var i = 1; i < peerIndex; i++) {
	if(!peerConns[idTable[i]])
 	    peerConns[idTable[i]] = new PeerConnection(idTable[i]);
	peerConns[idTable[i]].maybeStart();
    }
}

function handleUserMediaError(error){
    console.log('navigator.getUserMedia error: ', error);
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
navigator.getUserMedia(constraints, handleUserMedia, handleUserMediaError);

console.log('Getting user media with constraints', constraints);

// TODO: set TURN server

/////////////////////////////////
/// this is a peer agent deal with peer connection and media stream
function PeerConnection(connectedPeer) {
    console.log('Create PeerConnection Object');
    var self = this;
    this.peerConn;
    this.connectedPeerID;
    this.isStarted;
    this.remoteStream;
    this.media;
    this.connectedWith = connectedPeer;

    ////////////////////////////
    // create html media tag
    this.createTag = function () {
	var tagType;
	if (constraints.video) {
	    tagType = 'video';
	} else if (constraints.audio) {
	    tagType = 'audio';
	} else { /*  */	}

	this.media = document.createElement(tagType);
	this.media.autoplay = true;
	this.media.controls = true; // placeholder

	remoteMediaDiv.appendChild(this.media);
    }

    //////////////////////////
    // peer connection operations
   
    this.createPeerConnection = function() {
	try {
	    this.peerConn = new webkitRTCPeerConnection(null);
	    this.peerConn.onicecandidate = this.handleIceCandidate;
	    this.peerConn.onaddstream = this.handleRemoteStreamAdded;
	    this.peerConn.onremoveStream = this.handleRemoteStreamRemoved;
	    console.log('Created RTCPeerConnection Object');
	} catch (e) {
	    console.log('Failed to create PeerConnection Object');
	    console.log('With exception: ' + e.message);
	}
	
    }
    
    this.handleRemoteStreamAdded = function(event) {
	console.log('Remote stream added.');
	self.createTag();
	self.media.src = window.URL.createObjectURL(event.stream);
	self.remoteStream = event.stream;
    }

    this.handleIceCandidate = function(event) {
	console.log('handleIceCandidate event: ', event);
	if (event.candidate) {
	    //////////////
	    // TODO: sendMessageTO(event.from, myEvent);
	    sendMessageTo(self.connectedWith, {
		    type: 'candidate',
		    label: event.candidate.sdpMLineIndex,
		    id: event.candidate.sdpMid,
		    candidate: event.candidate.candidate});
	    ////////////////
	} else {
	    console.log('End of candidates.');
	    this.connected = true;
	}
    }

    this.handleCreateOfferError = function(event){
	console.log('createOffer() error: ', e);
    }
 
    this.doCall = function() {
	console.log('Sending offer to peer:', this.connectedWith);
	this.peerConn.createOffer(this.setLocalAndSendMessage, this.handleCreateOfferError);
    }

    this.doAnswer = function() {
	console.log('Sending answer to peer:', this.connectedWith);
	this.peerConn.createAnswer(this.setLocalAndSendMessage, null, sdpConstraints);
    }

    this.setLocalAndSendMessage = function(sessionDescription) {
	// Set Opus as the preferred codec in SDP if Opus is present.
	sessionDescription.sdp = preferOpus(sessionDescription.sdp);
	self.peerConn.setLocalDescription(sessionDescription);
	console.log('setLocalAndSendMessage sending message' , sessionDescription);
	////////////////////////
	// TODO: sendMessageTo(to, sessionDescription);
	sendMessageTo(self.connectedWith, sessionDescription);
	///////////////////////
    }

    this.handleRemoteStreamRemoved = function(event) {
	console.log('Remote stream removed. Event: ', event);
	//////////////////////
	// TODO: remove media tag, clear this object
	/////////////////////
    }

    this.maybeStart = function() {
	console.log('Calling maybeStart');
	if (!this.isStarted && typeof localStream != 'undefined' && isChannelReady) {
	    this.createPeerConnection();
	    this.peerConn.addStream(localStream);
	    this.isStarted = true;
	    console.log(peerIndex, idHash[this.connectedWith]);
	    if (peerIndex > idHash[this.connectedWith]) {
		console.log('Prepare to call peer:', this.connectedWith);
		this.doCall();
	    }
	}
    }

    //this function exec after recieving a 'bye' message
    this.handleRemoteHangup = function() {
	console.log('Session with',self.connectedWith,'terminated.');
	stop();
	//remove media tag
	remoteMediaDiv.removeChild(self.media);
    }

    this.stop = function() {
	// isAudioMuted = false;
	// isVideoMuted = false;
	self.peerConn.close();
    }

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

    // Strip CN from sdp before CN constraints is ready.
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
    //////////////////////
    // TODO: make hangup() usable for here
    sendMessage('bye');
    /////////////////////
}
