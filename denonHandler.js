module.exports.handleData = function(stringyfiedData, env, cb) {          
  if(stringyfiedData.indexOf('MV') === 0) {
	var currentVol = stringyfiedData.substring(3,stringifiedData.length -1) - 80;
  } else {
	env.logger.info('Received: ' + stringyfiedData);
  }
  
  var currentDisp;
  var currentIn;
  
  cb(currentVol, currentDisp, currentIn);
};

module.exports.sendCommand = function (controlCodes, currentVolume, command, pluginConfig, client) {
  var brand = 'denon';

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
        while (value.toString().length < 2) {
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