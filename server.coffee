express = require 'express'
app = express()

app.set 'view engine', 'jade'
app.set 'views', "#{__dirname}/views"

dir_name = process.cwd() + '/'

app.get '/', (req, res) ->
    res.sendFile dir_name + 'views/index.html'

app.get /^\/((?:js|css|img|public)\/.+)$/, (req, res) ->
    res.sendFile dir_name + req.params[0]
    
app.get /^\/room\/([A-Za-z0-9]+)$/, (req, res) ->
    res.render 'room.jade', { roomname: req.params[0] }

app.get /^\/class$/, (req, res) ->
    res.render 'class.jade'

server = require('http').createServer(app).listen 8080

count = require("#{__dirname}/bin/socket_server.coffee") server
