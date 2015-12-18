module.exports.handleData = function(stringyfiedData, env, cb) {          
  if(stringyfiedData.indexOf('MV') === 0) {
	var currentVol = stringyfiedData.substring(3,stringifiedData.length -1) - 80;
  } else {
	env.logger.info('Received: ' + stringyfiedData);
  }
  
  var currentDisp;
  var currentIn;
  
  cb(currentVol, currentDisp, currentIn);
}