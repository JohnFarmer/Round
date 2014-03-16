module.exports = (server) ->
    roomtable = {}
    guesttable = {}
    classroom = {}
    maxClients = 4
    maxClassMember = 6
    stuPerRoom = 3

    io = require('socket.io').listen server
    io.sockets.on 'connection', (client) ->
        client.on 'onboard home page', (name) ->
            console.log 'client onboard home page!'
            guesttable[name] = 'connected'
            roominfo = {}
            for key, value of roomtable
                roominfo[key] = roomtable[key].length - 1
            client.emit 'room info', roominfo

        randtalk = (student_list) ->
            console.log "DEBUG MSG"
            console.log student_list

            fisherYates = (list) ->
                posi = list.length - 1
                if posi == 0 or list == undefined
                    return []
                while posi >= 0
                    p = Math.floor(Math.random() * posi)
                    [list[posi], list[p]] = [list[p], list[posi]]
                    posi -= 1
                list
            student_list = fisherYates student_list
            console.log student_list

            for i in [0...student_list.length]
                student_list[i].emit 'goto room', "ChatGroup0#{i % stuPerRoom + 1}", maxClassMember
                console.log "DEBUG MSG:::", i


        client.on 'onboard class room', (room) ->
            room = 'foo'
            classroom[room] ||= []
            classroom[room].push client
            console.log client.id, "joined classroom: #{room}"
            for i in classroom[room]
                i.emit 'class room info', classroom[room].length, maxClassMember
            if classroom[room].length == maxClassMember
                randtalk classroom[room]
                classroom[room] = undefined
                console.log "class #{classroom[room]} cleared"
                
        log = () ->
            array = [">>> Message From Server: "]
            for i in [0...arguments.length]
                array.push arguments[i]
            client.emit 'log', array

        updateIndex = () ->
            idtable = []
            idtable.push roomtable[client.room].length - 1
            for i in [1...roomtable[client.room].length]
                idtable.push roomtable[client.room][i].id
            for i in [1...roomtable[client.room].length]
                console.log 'INDEXING:', i, idtable
                roomtable[client.room][i].emit 'index', i, idtable

        client.on 'broadcast', (type, message) ->
            console.log 'Transporting Board Message:', message
            for i in [1...roomtable[client.room].length]
                roomtable[client.room][i].emit 'broadcast', client.id, type, message

        client.on 'message', (message) ->
            console.log 'Send Message, from:', client.id
            console.log '                to:', 'ALL'
            console.log '               msg:', message
            if message == 'bye'
                return if !roomtable[client.room]
                i = roomtable[client.room].indexOf(client)
                roomtable[client.room].splice i,1
                if roomtable[client.room].length >= 2
                    updateIndex()
                else
                    roomtable[client.room] = undefined
                    console.log client.room, 'cleared'
                    return
            for i in [1...roomtable[client.room].length]
                roomtable[client.room][i].emit 'message', client.id, message

        client.on 'messageTo', (to, message) ->
            console.log 'Send Message, from:', client.id
            console.log '                to:', to
            console.log '               msg:', message
            for i in [1...roomtable[client.room].length]
                continue if roomtable[client.room][i].id != to
                roomtable[client.room][i].emit 'messageFrom', client.id, message

        client.on 'create or join', (room, name, initColor) ->
            if roomtable[room] == undefined
                numClients = 0
                roomtable[room] = []
                roomtable[room][0] = maxClients
            else
                numClients = roomtable[room].length - 1
            roomtable[room].push client
            
            client['room'] = room
            client['name'] = name
            updateIndex()

            log "Room #{room} has #{numClients} client(s)"
            log 'Request to create or join room', room

            if numClients == 0
                client.join room
                roomtable[room].initColor = initColor
                client.emit 'created', room
            else if numClients <= roomtable[room][0] - 1
                namehash = {}
                for i in [1..numClients]
                    roomtable[room][i].emit 'join', client.id, client.name
                    namehash[roomtable[room][i].id] = roomtable[room][i].name
                client.join room
                client.emit 'joined', room, namehash, roomtable[room].initColor
            else
                client.emit 'full', room
                
