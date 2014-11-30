# RoundTable
### a Talk Room Web App based on WebRTC.

RoundTable, is created for 2 to 4 people Video/Audio chat from dorm to dorm in collage.

Simular to Talky.io and other room based WebRTC Apps, there's no User Database, which means it's somewhat anoynmous. 

### Usage

~~~
$ git clone https://github.com/JohnFarmer/RoundTable.git
$ cd RoundTable
$ npm install (install coffee-script globally is recommanded)
$ npm test
~~~

fire up a browser, jump to localhost:8080, here you go.

Note that it works only on Chrome(PC/Mac and Android include Chromium) right now, because I'm using the webkit's WebRTC APIs. May fix it with lines of code.

Video is disabled by default. To enable it, you can modify the __constrains__(Line 33) variable in js/main.js.

### TODOs

* Firefox compatibilty
* File sharing
* Nice UI
