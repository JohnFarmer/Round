var peerConns = [];
var peerIndex;
var peerId = null;
var idTable;
var idHash;
var localStream;
var standingBy = false;

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
	isInitiator = true;
    });

socket.on('full', function (room){
	console.log('Room ' + room + ' is full');
    });

socket.on('join', function (room){
	console.log('Another peer made a request to join room ' + room);
	console.log('This peer is the initiator of room ' + room + '!');
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
    console.log('Client sending message to ' + idHash[to] + '(' + to.subString(0,4) + '): ', message);
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
	for (var i = 1; i <= idtable[1]; i++) idHash[idtable[i]] = i;
	console.log('>>> Update peer index:', peerIndex);
	console.log('    id table: ', idtable.toString());
    });

// deal with public message: bye
socket.on('message', function (from, message){
	console.log('Client received broadcast message from:', message);
	if (message === 'got user media') {
	    maybeStart();
	} else if (message.type === 'offer') {
	    if (!isInitiator && !isStarted) {
		maybeStart();
	    }
	    pc.setRemoteDescription(new RTCSessionDescription(message));
	    doAnswer();
	} else if (message.type === 'answer' && isStarted) {
	    pc.setRemoteDescription(new RTCSessionDescription(message));
	} else if (message.type === 'candidate' && isStarted) {
	    var candidate = new RTCIceCandidate({
		    sdpMLineIndex: message.label,
		    candidate: message.candidate
		});
	    pc.addIceCandidate(candidate);
	} else if (message === 'bye' && isStarted) {
	    handleRemoteHangup();
	}
    });

socket.on('messageFrom', function(from, message) {
	console.log('Client received message from (' + from + '):', message);
	if (message === 'got user media') {
	    maybeStart();
	} else if (message.type === 'offer') {
	    if (!isInitiator && !isStarted) {
		maybeStart();
	    }
	    pc.setRemoteDescription(new RTCSessionDescription(message));
	    doAnswer();
	} else if (message.type === 'answer' && isStarted) {
	    pc.setRemoteDescription(new RTCSessionDescription(message));
	} else if (message.type === 'candidate' && isStarted) {
	    var candidate = new RTCIceCandidate({
		    sdpMLineIndex: message.label,
		    candidate: message.candidate
		});
	    pc.addIceCandidate(candidate);
	} else if (message === 'bye' && isStarted) {
	    handleRemoteHangup();
	}
    });


///////////////////////////
/// setting local stream

function handleUserMedia(stream) {
    console.log('Adding local stream.');
    localAudio.src = window.URL.createObjectURL(stream);
    localStream = stream;
    sendMessage('got user media');
    if (isInitiator) {
	maybeStart();
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
function peerConnection() {
    this.peerConn;
    this.connectedPeerID;
    this.isChannelReady;
    this.isStarted;
    this.remoteStream;
    this.media;
    this.connected = false;
    this.connectedWith;

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

	remoteDiv.appendChild(this.media);
    }

    //////////////////////////
    // peer connection operations
   
    this.createPeerConnection = function() {
	try {
	    this.peerConn = new webkitRTCPeerConnection(null);
	    this.peerConn.onicecandidate = handleRemoteCandidate;
	    this.peerConn.onaddstream = handleRemoteStreamAdded;
	    this.peerConn.onremoveStream = handleRemoteStreamRemoved;
	    console.log('Created peerConnection Object');
	    this.peerConn.addStream(localStream);
	} catch (e) {
	    console.log('Failed to create peerConnection Object');
	    console.log('With exception: ' + e.message);
	}
    }

    function handleRemoteStreamAdded(event) {
	console.log('Remote stream added.');
	this.media.src = window.URL.createObjectURL(event.stream);
	this.remoteStream = event.stream;
    }

    function handleIceCandidate(event) {
	console.log('handleIceCandidate event: ', event);
	if (event.candidate) {
	    //////////////
	    // TODO: sendMessageTO(event.from, myEvent);
	    sendMessage({
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

    function handleCreateOfferError(event){
	console.log('createOffer() error: ', e);
    }
 
    function doCall() {
	console.log('Sending offer to peer');
	this.peerConn.createOffer(setLocalAndSendMessage, handleCreateOfferError);
    }

    function doAnswer() {
	console.log('Sending answer to peer.');
	this.peerConn.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
    }

    function setLocalAndSendMessage(sessionDescription) {
	// Set Opus as the preferred codec in SDP if Opus is present.
	sessionDescription.sdp = preferOpus(sessionDescription.sdp);
	this.peerConn.setLocalDescription(sessionDescription);
	console.log('setLocalAndSendMessage sending message' , sessionDescription);
	////////////////////////
	// TODO: sendMessageTo(to, sessionDescription);
	sendMessage(sessionDescription);
	///////////////////////
    }

    function handleRemoteStreamRemoved(event) {
	console.log('Remote stream removed. Event: ', event);
	//////////////////////
	// TODO: remove media tag, clear this object
	/////////////////////
    }

    //this function exec after recieving a 'bye' message
    this.handleRemoteHangup = fucntion() {
	//console.log('Session terminated.');
	stop();
	//isInitiator = false;
    }

    function stop() {
	this.isStarted = false;
	// isAudioMuted = false;
	// isVideoMuted = false;
	this.peerConn.close();
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

function hangup() {
    console.log('Hanging up.');
    stop();
    sendMessage('bye');
}