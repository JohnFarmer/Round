# Round
### a Talk Room Web App based on WebRTC.

Round, which refers to **the Round Table**, was created for Video/Audio chat from dorm to dorm in collage.

Simular to Talky.io and other room based WebRTC Apps, there's no User Database, which means it's somewhat anoynmous. 

### Usage

'git clone https://github.com/JohnFarmer/Round.git'
'cd Round'
'npm install'
'npm test'

then fire up a browser, jump to localhost:8080, here we go.

Note that it works only on Chrome(PC/Mac and Android include Chromium) right now, cauz I'm using the webkit's WebRTC APIs. May fix it with lines of code.

Video is disabled by default. To enable it, you can modify the __constrains__(Line 33) variable in js/main.js.
