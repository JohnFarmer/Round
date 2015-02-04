var HSLtoRGB = function(hue,saturation,lightness) {
    var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    console.log('chroma',chroma); //
    hue = hue / 60.0;
    console.log('hue\'',hue);//
    var x = chroma * (1 - Math.abs(hue % 2 - 1));
    console.log('x',x);//
    var R = 0, G = 0, B = 0;
    if (0 <= hue && hue < 1) {
	R = chroma; G = x;
	console.log(111);
    } else if (hue < 2) {
	R = x; G = chroma;
	console.log(222);
    } else if (hue < 3) {
	G = chroma; B = x;
	cosole.log(333);
    } else if (hue < 4) {
	G = x; B = chroma;
	console.log(444);
    } else if (hue < 5) {
	R = x; B= chroma;
	console.log(555);
    } else if (hue < 6) {
	R = chroma; B = x;
	console.log(666);
    } else {
	R = Math.random();G = Math.random(); B = Math.random();
	console.log(777);
    }
    console.log('R',R,'G',G,'B',B);
    var m = lightness - 0.5 * chroma;
    console.log('m',m);
    console.log('R',(m+R)*255,'G',(G+m)*255,'B',(B+m)*255);
    R = Math.floor(((R + m) * 255) + 1).toString(16);
    G = Math.floor(((G + m) * 255) + 1).toString(16);
    B = Math.floor(((B + m) * 255) + 1).toString(16);
    console.log(R);
    console.log(G);
    console.log(B);
};

var RGBtoHSL = function(initColor) {
    var initR = parseInt(initColor.slice(1,3), 16) / 255.0;
    var initG = parseInt(initColor.slice(3,5), 16) / 255.0;
    var initB = parseInt(initColor.slice(5,7), 16) / 255.0;
    // decimal number to hex string: using || (NUM).toString(16) ||
    // convert RGB into HSL => wikipedia
    var initM = Math.max(initR, initG, initB);
    var initm = Math.min(initR, initG, initB);
    var initChroma = initM - initm;

    var initHue;
    if (initChroma == 0) {
	//alert('Chroma = 0!, unable to make color wheel');
	//return defaultColorWheel;
    } else if (initM == initR) {
	initHue = ((initG - initB) / initChroma) % 6;
    } else if (initM == initG) {
	initHue = (initB - initR) / initChroma + 2;
    } else if (initM == initB) {
	initHue = (initR - initG) / initChroma + 4;
    } else {
	return defaultColorWheel;
    }
    initHue = 60.0 * initHue;

    var initLightness = 0.5 * (initM + initm);

    var initSaturation = initChroma / (1 - Math.abs(2 * initLightness - 1));
    
    console.log(initHue, initLightness, initSaturation);
};

RGBtoHSL('#ABCDEF');
