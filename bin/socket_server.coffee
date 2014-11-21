module.exports = (server) ->
    maxClients = 4
    maxClassMember = 6
    stuPerRoom = 3

    roomT = {}
    count = {}
    color = {}
    guestT = {}
    classT = {}

    io = require('socket.io').listen server
    io.sockets.on 'connection', (client) ->
        client.on 'onboard home page', (name) ->
            console.log 'client onboard home page!'
            guestT[name] = 'connected'
            roominfo = {}
            for rm of roomT
                roominfo[rm] = count[rm]
            client.emit 'room info', roominfo

        client.on 'onboard class rm', (rm) ->
            rm = 'foo'
            classT[rm] ||= []
            classT[rm].push client
            console.log client.id, "joined classrm: #{rm}"
            for cli in classT[rm]
                cli.emit 'class rm info', classT[rm].length, maxClassMember
            if classT[rm].length == maxClassMember
                randtalk classT[rm]
                classT[rm] = undefined
                console.log "class #{classT[rm]} jumped into talk page"

        log = () ->
            array = [">>> Message From Server: "]
            for i in [0...arguments.length]
                array.push arguments[i]
            client.emit 'log', array

        updateIndex = (rm) ->
            idtable = []
            idtable.push count[rm]
            for cli in roomT[rm]
                idtable.push cli.id
            for i,cli of roomT[rm]
                # attention here i is a string
                index = parseInt(i, 10) + 1
                console.log 'INDEXING:', index, idtable
                cli.emit 'index', index, idtable

        client.on 'boardmsg', (type, message) ->
            rm = client.room
            console.log 'Transporting Board Message:', message
            for cli in roomT[rm]
                console.log 'Sending Board Message to #{cli}'
                cli.emit 'boardmsg', client.id, type, message

        client.on 'test-socket', () ->
            console.log 'test-socket message recieved'

        client.on 'message', (to, message) ->
            rm = client.room
            console.log 'Message, from:', client.id
            console.log '           to:', to
            console.log '          msg:', message
            for i in [0...count[rm]]
                continue if to != 'all' and roomT[rm][i].id == client.id
                roomT[rm][i].emit 'message', client.id, message

        client.on 'create or join', (rm, conf) ->
            if roomT[rm] == undefined
                roomT[rm] = []
                count[rm] = 0
            roomT[rm].push client

            client['room'] = rm
            client['name'] = conf.name

            log "Room #{rm} has #{count[rm]} client(s)"
            log 'Request to create or join room', rm

            if count[rm] == 0
                client.join rm
                color[rm] = conf.initColor
                client.emit 'created', rm
            else if count[rm] <= maxClients
                namehash = {}
                for cli in roomT[rm]
                    cli.emit 'join', client.id, client.name
                    namehash[cli.id] = cli.name
                client.join rm
                client.emit 'joined', rm, namehash, color[rm]
            else
                client.emit 'full', rm
            count[rm] += 1
            updateIndex rm

        client.on 'disconnect', () ->
            console.log client.id, 'DISCONNECTED' # debug
            rm = client.room
            return if !roomT[rm]
            i = roomT[rm].indexOf(client)
            console.log i
            console.log roomT[rm]
            roomT[rm].splice i,1
            count[rm] -= 1
            if count[rm] >= 1
                updateIndex rm
            else
                roomT[rm] = undefined
                count[rm] = undefined
                console.log rm, 'cleared'
                return
            for cli in roomT[rm]
                cli.emit 'message', client.id, 'bye'

    # broadcast = () ->

    randtalk = (student_list) ->
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

        for i in [0...student_list.length]
            student_list[i].emit 'goto room', "ChatGroup0#{i % stuPerRoom + 1}", maxClassMember
