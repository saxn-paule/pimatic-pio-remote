var __bind = function(fn, me){
  return function(){
    return fn.apply(me, arguments);
  };
},
__hasProp = {}.hasOwnProperty,
__extends = function(child, parent) {
  for (var key in parent) {
    if (__hasProp.call(parent, key)) child[key] = parent[key];
  }
  function ctor() {
    this.constructor = child;
  }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  return child;
};

module.exports = function(env) {
  var M, PioRemotePlugin, PioRemoteActionProvider, PioRemoteActionHandler, pioRemotePlugin, pioRemoteActionHandler, client, pluginConfig, connected;
  M = env.matcher;
  
  var Promise = env.require('bluebird');
  var net = env.require('net');
  var util = env.require('util');
  var assert = env.require('cassert');
  
  /**
  * Default connection parameters
  **/
  var defaultHost = '192.168.0.15';
  var defaultPort= 23;
  var defaultMaxVolume = 100;
  var defaultBrand = 'pioneer';

  var currentVolume = 0;
  var currentDisplay = '';
  var hmgDisplay = '';
  var currentInput = '';

  
  /**
  * Additional codes (control iPod etc.) for pioneer or denon receivers could be found here:
  * http://www.pioneerelectronics.com/StaticFiles/PUSA/Files/Home%20Custom%20Install/VSX-1120-K-RS232.PDF
  * and here
  * http://openrb.com/wp-content/uploads/2012/02/AVR3312CI_AVR3312_PROTOCOL_V7.6.0.pdf
  **/
  var controlCodes = require("./commands.json");
  
  /**
   * THE PLUGIN ITSELF 
  **/
  PioRemotePlugin = (function(_super) {
    __extends(PioRemotePlugin, _super);

    function PioRemotePlugin() {
      this.init = __bind(this.init, this);      
      return PioRemotePlugin.__super__.constructor.apply(this, arguments);
    }

    PioRemotePlugin.prototype.init = function(app, framework, config) {
      var deviceConfigDef;
      this.framework = framework;
      this.config = config;
      pluginConfig = config;
      this.framework.ruleManager.addActionProvider(new PioRemoteActionProvider(this.framework));

      deviceConfigDef = require("./device-config-schema");

      this.framework.deviceManager.registerDeviceClass("AVRSensor", {
        configDef: deviceConfigDef.AVRSensor,
        createCallback: (function(_this) {
          return function(config) {
            return new AVRSensor(config, framework);
          };
        })(this)
      });
    };

    return PioRemotePlugin;

  })(env.plugins.Plugin);

  pioRemotePlugin = new PioRemotePlugin;
  /**
   * THE ACTION PROVIDER
  **/
  PioRemoteActionProvider = (function(_super) {
    __extends(PioRemoteActionProvider, _super);

    function PioRemoteActionProvider(framework, config) {
      this.framework = framework;
      this.config = config;
      this.connectAction = __bind(this.connectAction, this);
    }

    /**
     *This function handles action in the form of `sendAvr "some string"`
    **/

    PioRemoteActionProvider.prototype.parseAction = function(input, context) {
      var commandTokens, fullMatch, m, match, onEnd, retVal, setCommand;
      retVal = null;
      commandTokens = null;
      fullMatch = false;
      setCommand = (function(_this) {
        return function(m, tokens) {
          return commandTokens = tokens;
        };
      })(this);

      onEnd = (function(_this) {
          return function() {
            return fullMatch = true;
          };
      })(this);

      m = M(input, context).match("sendAvr ").matchStringWithVars(setCommand);
      if (m.hadMatch()) {
        match = m.getFullMatch();
        return {
          token: match,
          nextInput: input.substring(match.length),
          actionHandler: new PioRemoteActionHandler(this.framework, commandTokens)
        };
      } else {
        return null;
      }
    };

    return PioRemoteActionProvider;

  })(env.actions.ActionProvider);

  /**
   * THE ACTION HANDLER 
  **/

  PioRemoteActionHandler = (function(_super) {
    __extends(PioRemoteActionHandler, _super);

    function PioRemoteActionHandler(framework, commandTokens) {
      this.framework = framework;
      this.commandTokens = commandTokens;
      this.executeAction = __bind(this.executeAction, this);
      this.connect = __bind(this.connect, this);   
      this.disconnect = __bind(this.disconnect, this);
      this.sendCommand = __bind(this.sendCommand, this);
    }

    /**
    * Method for establishing connection to the receiver
    **/
    PioRemoteActionHandler.prototype.connect = function(command) {      
      if(!client || !connected) {
        env.logger.info('Client isn\'t connected yet, establish new connection...');

        client = new net.Socket();

        client.on('data', function(data) {
          pioRemoteActionHandler.handleData(data.toString());
        });

        /**
        * this event is triggered, if the connection is successfully established
        **/
        client.on('connect', function() {
          env.logger.info('Connection successfully established');
          connected = true;
        });

        client.on('error', function(ex) {
          env.logger.info('An error occured during connecting to avr: ' + ex);
          connected = false;
        });

        client.on('close', function() {
          if(client && connected) {
            env.logger.info('Connection closed');          
            client.disconnect();
          }  
        });

        client.connect(pluginConfig.port ? pluginConfig.port : defaultPort,
          pluginConfig.host ? pluginConfig.host : defaultHost, function() {

          if(command) {
            /**
            * assuming everything went okay, because there is no callback
            **/
            return pioRemoteActionHandler.sendCommand(command);
          } else {
            return 'done';
          }  
        });
      } else {
        env.logger.info('Client already connected, nothing to do.');
      }

      return 'done'; 
    };

    /**
    * Method to call when connection isn't needed any longer
    **/
    PioRemoteActionHandler.prototype.disconnect = function() {
      if(client && connected) {
        env.logger.info('Closing telnet session...');
        client.destroy();
        client = undefined;
        connected = false;
      
        return 'disconnected';
      } else {
        env.logger.info('Nothing to disconnect from.');
      }
      
      return 'disconnected';
    };
	
    /**
    * Method for sending a command
    **/
    PioRemoteActionHandler.prototype.sendCommand = function(command) {
      var brand = pluginConfig.brand || defaultBrand;

      /**
      * parse the command
      **/
      if(command && command.indexOf('\.') > 0) {
        var splittedCommand = command.split('\.');
        var category = splittedCommand[0];
        var func = splittedCommand[1];
        
        var maxVolume = pluginConfig.maxVolume || defaultMaxVolume;
        if(maxVolume > 185) {
          maxVolume = 185;
        }

        var value = '';

        /**
         * Handle max volume to avoid damage on user and equipment
        **/
        if(category === 'volume' && func === 'up') {
          var volLevel = (currentVolume + 80.5) * 2;
          
          if(volLevel >= maxVolume) {
            currentDisplay = 'Vol max reached!';
            return 'Vol max reached!';
          }
        }

        if(category === 'volume' && func === 'down') {
          if(currentVolume > 0) {
            currentDisplay = 'Vol min reached!';
            return 'Vol min reached!';
          }
        }

        if(splittedCommand.length === 3) {

          value = splittedCommand[2];
          env.logger.info('value: ' + value);

          /**
          * Calculate correct value depending on maxValue
          **/
          if(category === 'volume' && func === 'set') {
            if(category === 'volume' && value < 0) {
              value = '001';
            }

            value = Math.round((value * maxVolume / 100),0);
            while(value.toString().length < 3) {
              value = '0' + value;
            }
          }

          /**
           * Catch negative values
          **/

        }

        if(controlCodes[brand][category][func]) {
          var dataToWrite = value + controlCodes[brand][category][func] + '\r';

          var dataSent = client.write(dataToWrite);
          if(dataSent) {
            return 'Sent command: ' + dataToWrite;
          } else {
            return 'An error occured while sending data: ' + dataToWrite;            
          }
        }
      } else {
        return 'Unsupported command: ' + command;
      }
    };

    /**
    * Handle the incoming data
    **/ 
    PioRemoteActionHandler.prototype.handleData = function(stringyfiedData) {

          if(stringyfiedData.indexOf('VOL') === 0) {
            currentVolume = (0.5 * stringyfiedData.substring(3,6) - 80.5);

          } else if(stringyfiedData.indexOf('FL0') === 0) { // handle default display
            var str = '';
            for (var i = 4; i < stringyfiedData.length; i += 2) {
              str += String.fromCharCode(parseInt(stringyfiedData.substr(i, 2), 16));
            }

            // Cut text to 15 characters
            if(str.length > 15) {
              str = str.substring(0, 15);
            } 

            /**
            if(hmgDisplay.length !== 0 && stringyfiedData.indexOf('FL00') !== 0) {
              currentDisplay = str + '\n\r' + hmgDisplay;
            } else {
              currentDisplay = str;
            }
            **/
            currentDisplay = str;            
          } else if(stringyfiedData.indexOf('FN') === 0) { // handle input display
            currentInput = stringyfiedData;
          } else if(stringyfiedData.indexOf('GEH01020') >= 0) { // handle H.M.G. display
            var start = stringyfiedData.indexOf('GEH01020') + 9;
            var stop = stringyfiedData.indexOf('GEH02023') -3;
            hmgDisplay = stringyfiedData.substring(start, stop);
            env.logger.info('H.M.G. Display: ' + hmgDisplay);
          } else {
            env.logger.info('Received: ' + stringyfiedData);
          }
    };

    /**
    * This function handles action in the form of `sendAVR "command"`
    **/
    PioRemoteActionHandler.prototype.executeAction = function() {
      return this.framework.variableManager.evaluateStringExpression(this.commandTokens).then((function(_this) {        
        return function(command) {
          switch(command) {
            case 'connect':
              return pioRemoteActionHandler.connect();
              break;
            case 'disconnect':
              return pioRemoteActionHandler.disconnect();
              break;
            default:
              /**
              * If no connection to the AVR exists, connect first and send the command afterwards
              **/
              if(!client || !connected) {
                return pioRemoteActionHandler.connect(command);  
				      } else {
					      return pioRemoteActionHandler.sendCommand(command);
				      }
          } 
        };

      })(this));
    };

    return PioRemoteActionHandler;

  })(env.actions.ActionHandler);
  pioRemoteActionHandler = new PioRemoteActionHandler;

  /**
  * THE VOLUME SENSOR
  **/
  AVRSensor = (function(_super) {
    __extends(AVRSensor, _super);

    function AVRSensor(config, framework) {
      var attr;
      this.config = config;
      this.id = config.id;
      this.name = config.name;
      this.attributes = {};

      var func = (function(_this) {
        return function(attr) {
          var name = attr.name;

          assert(name === 'vol' || name === 'display');

          switch (name) {
            case 'vol':
              _this.attributes[name] = {
                description: name,
                type: "number"
              };

              var getter = (function() {
                if(!client) {
                  pioRemoteActionHandler.connect();
                } else {
                  pioRemoteActionHandler.sendCommand('volume.status');
                }
                return Promise.resolve(currentVolume);
              });
              _this.attributes[name].unit = 'dB';
              _this.attributes[name].acronym = 'VOL';
              break;
            case 'display':
              _this.attributes[name] = {
                description: name,
                type: "string"
              };

              var getter = (function() {
                if(!client) {
                  pioRemoteActionHandler.connect();
                } 
                return Promise.resolve(currentDisplay);
              });
              break;
            default:
              throw new Error("Illegal attribute name: " + name + " in AVRSensor.");
          }

          _this._createGetter(name, getter);

          return setInterval((function() {
            return getter().then(function(value) {
              return _this.emit(name, value);
            })["catch"](function(error) {
              return env.logger.debug(error.stack);
            });
          }), 1000);
          
        };
      })(this);

      for (var i = 0; i < this.config.attributes.length; i++) {
        attr = this.config.attributes[i];
        func(attr);
      }

      AVRSensor.__super__.constructor.call(this);
    }

    return AVRSensor;

  })(env.devices.Sensor);

  module.exports.PioRemoteActionProvider = PioRemoteActionProvider;

  return pioRemotePlugin;
};