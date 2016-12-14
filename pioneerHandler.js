module.exports.handleData = function (stringyfiedData, env, cb) {
  if (stringyfiedData.indexOf('VOL') === 0) {
    var currentVol = (0.5 * stringyfiedData.substring(3, 6) - 80.5);

  } else if (stringyfiedData.indexOf('FL0') === 0) {
    // handle default display
    var str = '';
    for (var i = 4; i < stringyfiedData.length; i += 2) {
      str += String.fromCharCode(parseInt(stringyfiedData.substr(i, 2), 16));
    }

    // Cut text to 15 characters
    if (str.length > 15) {
      str = str.substring(0, 15);
    }

    var currentDisp = str;
  } else if (stringyfiedData.indexOf('PWR') === 0) {	  
    // handle power state
	var tempState = stringyfiedData.substring(3, 4);
	
	// the states are not intuitive so we have to switch them
	if(tempState === '1') {
	  var currentState = 0;
	} else if (tempState === '0'){
	  var currentState = 1;
	} else {
	  env.logger.info('This power state is unknown: ' + tempState);
	}	
  } else if (stringyfiedData.indexOf('FN') === 0) {
    // handle input display
    var currentIn = stringyfiedData;
  } else {
    //env.logger.info('Received: ' + stringyfiedData);
  }
  cb(currentVol, currentDisp, currentState, currentIn);
};

module.exports.sendCommand = function (controlCodes, currentVolume, command, pluginConfig, client) {
  var brand = 'pioneer';

  /**
   * parse the command
   **/
  if (command && command.indexOf('\.') > 0) {
    var splittedCommand = command.split('\.');
    var category = splittedCommand[0];
    var func = splittedCommand[1];

    var maxVolume = pluginConfig.maxVolume || defaultMaxVolume;
    if (maxVolume > controlCodes[brand].maxVolume) {
      maxVolume = controlCodes[brand].maxVolume;
    }

    var volLevel = (currentVolume + 80.5) * 2;
    var value = '';

    /**
     * Handle max volume to avoid damage on user and equipment
     **/
    if (category === 'volume' && func === 'up') {
      if (volLevel >= maxVolume) {
        return 'Vol max reached!';
      }
    }

    if (category === 'volume' && func === 'down') {
      if (volLevel <= 1) {
        return 'Vol min reached!';
      }
    }

    if (splittedCommand.length === 3) {
      value = splittedCommand[2];
      /**
       * Calculate correct value depending on maxValue
       **/
      if (category === 'volume' && func === 'set') {
        if (category === 'volume' && value < 0) {
          value = '001';
        }

        value = Math.round(value * maxVolume / 100);
        while (value.toString().length < 3) {
          value = '0' + value;
        }
      }
    }

    if (controlCodes[brand][category][func]) {
      var dataToWrite = value + controlCodes[brand][category][func] + '\r';

      var dataSent = client.write(dataToWrite);
      if (dataSent) {
        return 'Sent command: ' + dataToWrite;
      } else {
        return 'An error occurred while sending data: ' + dataToWrite;
      }
    }
  } else {
    return 'Unsupported command: ' + command;
  }
};