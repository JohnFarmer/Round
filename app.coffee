express = require 'express'
app = express()

# using jade as view engine, expect index page
app.set 'view engine', 'jade'
app.set 'views', "#{__dirname}/www/views"

dir_name = process.cwd() + '/'

# route for root
app.get '/', (req, res) ->
    res.sendFile dir_name + 'www/views/index.html'

# route for static contents
app.get /^\/((?:js|css|img|public)\/.+)$/, (req, res) ->
    res.sendFile dir_name + 'www/' + req.params[0]

# route for /room/[room name]
app.get /^\/room\/([A-Za-z0-9]+)$/, (req, res) ->
    res.render 'room.jade', { roomname: req.params[0] }

# currently there is only on class room
app.get /^\/class$/, (req, res) ->
    res.render 'class.jade'

server = require('http').createServer(app).listen 8080

# socket_server took this server as init param,
# like this: "io = require('socket.io').listen server"
# to bind it with the main program
# return a closure which has access to the state of socket_server
count = require("#{__dirname}/websocket/sockserver.coffee") server
