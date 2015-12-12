var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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

  var currentVolume = 0;
  
  
  /**
  * Additional codes (control iPod etc.) could be found here: 
  * http://www.pioneerelectronics.com/StaticFiles/PUSA/Files/Home%20Custom%20Install/VSX-1120-K-RS232.PDF
  **/
  var controlCodes = {};
  
  /**
  * codes for handling the volume
  * xxxVL range is from 000 (mute) to 185 (+12dB)
  * but should be limited to 100 (-30,5dB)
  **/
  controlCodes.volume = {
    'down':     'VD',
    'up':       'VU',
    'set':      'VL',
    'mute':     'MZ',
    'status':   '?V'
  };
  
  /**
  * codes for handling the power
  **/
  controlCodes.power = {
  	'on':       'PO',
    'off':      'PF',
    'status':   '?Q'
  };
  
  /**
  * codes for handling the input
  **/
  controlCodes.input = {
    'phono':    '00FN',
    'cd':       '01FN',
    'cdr_tape': '03FN',
    'dvd':      '04FN',
    'tv_sat':   '05FN',
    'video1':   '10FN',
    'video2':   '14FN',
    'dvr_bdr':  '15FN',
    'ipod_usb': '17FN',
    'hdmi1':    '19FN',
    'hdmi2':    '20FN',
    'hdmi3':    '21FN',
    'hdmi4':    '22FN',
    'hdmi5':    '23FN',
    'hdmi6':    '24FN',
    'bd':       '25FN',
    'hmg':      '26FN',
    'internet_radio':'38FN',
    'change':'FU',
    'status':   '?F'
  };

  /**
   * Gets the current displayed information
  **/
  controlCodes.display = {
    'status':   'STS'
  };

  /**
   * codes for handling the cursor
   **/
  controlCodes.cursor = {
    'up':       'CUP',
    'down':     'CDN',
    'right':    'CRI',
    'left':     'CLE',
    'enter':    'CEN'
  };
  
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

      this.framework.deviceManager.registerDeviceClass("VolumeSensor", {
        configDef: deviceConfigDef.VolumeSensor,
        createCallback: (function(_this) {
          return function(config) {
            return new VolumeSensor(config, framework);
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
      this.myOptionKeys = ['connect'];
      //this.configWithDefaults = _.assign(config.__proto__, config);
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
          if(data.toString().indexOf('VOL') === 0) {
            currentVolume = (0.5 * data.toString().substring(3,6) - 80.5);
          } else {
            env.logger.info('Received: ' + data);
          }
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
          if(client) {
            env.logger.info('Connection closed');          
            client.disconnect();
          }  
        });

        client.connect(pluginConfig.port ? pluginConfig.port : defaultPort, pluginConfig.host ? pluginConfig.host : defaultHost, function() {
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
      if(client) {
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
      /**
      * parse the command
      **/
      if(command && command.indexOf('\.') > 0) {
        var splittedCommand = command.split('\.');
        var category = splittedCommand[0];
        var func = splittedCommand[1];

        var value = '';

        /**
         * Handle max volume to avoid damage on user and equipment
        **/
        if(splittedCommand.size === 3) {
          value = splittedCommand[2];
          if(category === 'volume' && value > defaultMaxVolume) {
            value = defaultMaxVolume;
          }

          /**
           * Catch negative values
          **/
          if(category === 'volume' && value < 0) {
            value = 0;
          }
        }

        if(controlCodes[category][func]) {
          var dataToWrite = value + controlCodes[category][func] + '\r';

          var dataSent = client.write(dataToWrite);
          if(dataSent) {
            return 'Sent command: ' + dataToWrite;
          } else {
            return 'An error occured while sending data: ' + dataToWrite;            
          }
        }
      } else {
        return 'Unsupported command!';
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
  VolumeSensor = (function(_super) {
    __extends(VolumeSensor, _super);

    function VolumeSensor(config, framework) {
      var attr;
      this.config = config;
      this.id = config.id;
      this.name = config.name;
      this.attributes = {};
      var func = (function(_this) {
        return function(attr) {
          var name = 'vol';

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


          _this._createGetter(name, getter);
          return setInterval((function() {
            return getter().then(function(value) {
              return _this.emit(name, value);
            })["catch"](function(error) {
              return env.logger.debug(error.stack);
            });
          }), 2000);
          
        };
      })(this);

      func(this.config.attributes[0]);

      VolumeSensor.__super__.constructor.call(this);
    }

    return VolumeSensor;

  })(env.devices.Sensor);

  module.exports.PioRemoteActionProvider = PioRemoteActionProvider;

  return pioRemotePlugin;
};