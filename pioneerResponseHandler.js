module.exports.handleData = function(stringyfiedData, env, cb) {          
  if(stringyfiedData.indexOf('VOL') === 0) {
	var currentVol = (0.5 * stringyfiedData.substring(3,6) - 80.5);
	
  } else if(stringyfiedData.indexOf('FL0') === 0) { 
	// handle default display
	var str = '';
	for (var i = 4; i < stringyfiedData.length; i += 2) {
	  str += String.fromCharCode(parseInt(stringyfiedData.substr(i, 2), 16));
	}

	// Cut text to 15 characters
	if(str.length > 15) {
	  str = str.substring(0, 15);
	} 

	var currentDisp = str;            
  } else if(stringyfiedData.indexOf('FN') === 0) { 
	// handle input display
	var currentIn = stringyfiedData;
  } else {
	env.logger.info('Received: ' + stringyfiedData);
  }
  
  cb(currentVol, currentDisp, currentIn);
}