# Action
The provided action is called "**sendAVR**".  

# Sensor
The provided sensor class is:
* AVRSensor

## Sensor attributes  
Possible attributes are:  
* volume
* display

# Commands
### connect
Should only be used for debugging purposes. Creates a socket connection to the avr. Is automatically called on pimatic startup or before sending a data
command if necessary.

### disconnect
Should only be used for debugging purposes. Ends the connection to the avr, if exist.

### sendCommand
Has to be used in the following syntax (*value* is optional and only usable with "volume.set" at the moment):
```
[action] "[category].[command].[value]"
```
Sample:
*Set volume to -40dB (pioneer)*
```
sendAVR "volume.set.080"
```

*Switch the AVR off*
```
sendAVR "power.off"
```

## Supported commands
*handling the volume*
* volume.down
* volume.up
* volume.set
* volume.mute
* volume.status

*handling power status*
* power.on
* power.off
* power.status

*handling the input*
* input.phono
* input.cd
* input.cdr_tape
* input.dvd
* input.tv_sat
* input.video1
* input.video2
* input.dvr_bdr
* input.ipod_usb
* input.hdmi1
* input.hdmi2
* input.hdmi3
* input.hdmi4
* input.hdmi5
* input.hdmi6
* input.bd
* input.hmg
* input.internet_radio
* input.change (*cycle through available inputs*)
* input.status (*gets the currently selected input*)

*get currently shown display information*
* display.status

*change the listening mode*
* sound.extStereo
* sound.autoSurr
* sound.direct
* sound.pureDirect

*control the cursor*
* cursor.up
* cursor.down
* cursor.right
* cursor.left
* cursor.enter
* cursor.back

Additional commands for iPod control etc. could be found here but are not supported by this plugin yet. Feel free to contribute.  
Pioneer: http://www.pioneerelectronics.com/StaticFiles/PUSA/Files/Home%20Custom%20Install/VSX-1120-K-RS232.PDF
Denon: http://openrb.com/wp-content/uploads/2012/02/AVR3312CI_AVR3312_PROTOCOL_V7.6.0.pdf

# Configuration
There are three (self explaining) configuration parameters
* host
* port
* maxVolume
* brand

### Sample Plugin Config:
```javascript    
    {
      "plugin": "pio-remote",
      "host": "192.168.0.15",
      "port": 23,
      "maxVolume": 100,
      "brand": "pioneer" || "denon" (default: pioneer)
    }
```
The available volume level depends on the AVR brand.  
**Pioneer**: Volume range from 000 (mute) till 185 (+12dB). Concrete value could be calculated by the following formula
```
dB = 0.5 * volLevel - 80,5
```
Sample for a limit of -50dB
```
-50 = 0.5 * volLevel - 80.5
30.5 = 0.5 * volLevel
61 = volLevel
```
**Denon**: Volume range from 000 (-80dB) till 098 (+18dB). Concrete value could be calculated by the following formula
```
dB = volLevel - 80
```
Sample for a limit of -50dB
```
-50 = volLevel - 80
30 = volLevel
```

### Sample Sensor Config:
```javascript    
    {
      "class": "AVRSensor",
      "id": "avrsensor",
      "name": "AVR",
      "attributes": [
        {
          "name": "display"
        },
        {
          "name": "vol"
        }
      ],
      "xAttributeOptions": [
        {
          "name": "vol",
          "displaySparkline": false,
          "hidden": false
        }
      ]
    }
```

### Sample Volume Slider config:  
*Slider*
```
    {
      "class": "DummyDimmer",
      "id": "dummy-dimmer",
      "name": "Slider"
    }
```    
*Rule*
```
    {
      "id": "change-vol",
      "name": "change vol",
      "rule": "if $dummy-dimmer.dimlevel changes then sendAvr \"volume.set.$dummy-dimmer.dimlevel\"",
      "active": true,
      "logging": true
    }
```


Port could be 23 or 8102 depending on the model.

# Known devices:
### Port 23:
* Pioneer SC-81
* Pioneer VSX-921
* Pioneer VSX-922

### Port 8102:
* Pioneer SC-81
* Pioneer VSX-42
* Pioneer VSX-43
* Pioneer VSX-527
* Pioneer VSX-528
* Pioneer VSX-921
* Pioneer VSX-1020
* Pioneer VSX-1023
* Pioneer VSX-2120
* Pioneer VSX-S510

# Beware
This plugin is in an early alpha stadium and you use it on your own risk. 
I'm not responsible for any possible damages that occur on your health, hard- or software.

# License
MIT
