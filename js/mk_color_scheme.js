var mkColorWheel = function(initColor) {
    // parameter iniColor ~= '#ABCDEF'
    // this function will Return a ARRAY which contains the COLOR WHEEL(12)
    var defaultColorWheel = ['#ABCDEF','ABABEE','#CDABEE','#EEABEE','#EEABCC','#EEABAB','#EECDAB','#EECDAB','#CCEEAB','#ABEEAB','#ABEECD','#ABEEEE'];

    // check initColor's Format
    //if (initColor.match '#[[0-9][A-F]]{6,6}') throw err;
    
    // get R G B in 0-255
    var init = RGBtoHSL(initColor);
    if (!init) return defaultColorWheel;
    
    var results = [];
    var hue = init['hue'], sat = init['saturation'], lig = init['lightness'];
    for (var i = 0; i < 12; i++)
	results.push(HSLtoRGB((hue + i * 30) % 360, sat, lig));
    return results;
};

var RGBtoHSL = function(RGB) {
    // RGB is something like '#AABBCC', RGBtoHSL formula => wikipedia
    var result = {};

    var R = parseInt(RGB.slice(1,3), 16) / 255.0;
    var G = parseInt(RGB.slice(3,5), 16) / 255.0;
    var B = parseInt(RGB.slice(5,7), 16) / 255.0;

    var M = Math.max(R, G, B);
    var m = Math.min(R, G, B);
    var chroma = M - m;

    var hue;
    if (chroma == 0) {
	return undefined;
    } else if (M == R) {
	hue = ((G - B) / chroma) % 6;
    } else if (M == G) {
	hue = (B - R) / chroma + 2;
    } else if (M == B) {
	hue = (R - G) / chroma + 4;
    } else {
	return defaultRGBWheel;
    }
    result['hue'] = 60.0 * hue;

    result['lightness'] = 0.5 * (M + m);
    result['saturation'] = chroma / (1 - Math.abs(2 * result['lightness'] - 1));
    
    return result;
};

var HSLtoRGB = function(hue, saturation, lightness) {
    var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    hue = hue / 60.0;
    var x = chroma * (1 - Math.abs(hue % 2 - 1));
    var R = 0, G = 0, B = 0;
    if (0 <= hue && hue < 1) {
	R = chroma; G = x;
    } else if (hue < 2) {
	R = x; G = chroma;
    } else if (hue < 3) {
	G = chroma; B = x;
    } else if (hue < 4) {
	G = x; B = chroma;
    } else if (hue < 5) {
	R = x; B= chroma;
    } else if (hue < 6) {
	R = chroma; B = x;
    } else {
	R = Math.random();G = Math.random(); B = Math.random();
    }
    var m = lightness - 0.5 * chroma;
    R = Math.floor(((R + m) * 255)).toString(16);
    G = Math.floor(((G + m) * 255)).toString(16);
    B = Math.floor(((B + m) * 255)).toString(16);
    return '#' + R + G + B;
};

console.log(mkColorWheel('#ABCDEF'));
