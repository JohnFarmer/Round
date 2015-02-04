var peerColorScheme = {};
var peerName = 'Lucky' + Math.floor(Math.random() * 1000);
var roomInfo;

var roomlist = document.getElementById('roomlist');
var sendBtn = document.getElementById('sendbtn');

peerColorScheme['init'] = "#ABCDEF";
peerColorScheme['wheel'] = mkColorWheel(peerColorScheme['init']);

handlePageColor();

var socket = io.connect();

socket.emit('onboard home page', peerName);

socket.on('room info', function(roominfo) {
    console.log('socket on room info');
    roomInfo = roominfo;
    handleRoomList();
});

var handleRoomList = function() {
    console.log('print room list:');
    for (var key in roomInfo) {
	var listItem = document.createElement('p');
	listItem.innerHTML = 
	    '<a href="/room/' + key + '">' + key + '</a>   ' + (roomInfo >= 4? 'Full': roomInfo[key]);
	roomlist.appendChild(listItem);
	console.log(key);
    }
};

sendBtn.onclick = function() {
    var targetRoomName = document.getElementById('roomnamebox').value;
    if (targetRoomName == '') {
	console.log('Empty');
	document.getElementById('roomnamebox').value = '';
	alert('Box can\'t be empty~');
	return;
    }
    
    window.location.replace('/room/' + targetRoomName);
};
