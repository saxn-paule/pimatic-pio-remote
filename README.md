# Action
The provided action is called "**sendAVR**".

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
*Set volume to -40dB*
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

*control the cursor*
* cursor.up
* cursor.down
* cursor.right
* cursor.left
* cursor.enter

Additional commands for iPod control etc. could be found here but are not supported by this plugin yet. Feel free to contribute.: http://www.pioneerelectronics.com/StaticFiles/PUSA/Files/Home%20Custom%20Install/VSX-1120-K-RS232.PDF

# Configuration
There are three (self explaining) configuration parameters
* host
* port
* maxVolume

Sample:
```javascript    
    {
      "plugin": "pio-remote",
      "host": "192.168.0.15",
      "port": 23,
      "maxVolume": 100
    }
```

Port could be 23 or 8102 depending on the model.

# Known devices:
### Port 23:
* SC-81
* VSX-921
* VSX-922

### Port 8102:
* SC-81
* VSX-42
* VSX-43
* VSX-527
* VSX-528
* VSX-921
* VSX-1020
* VSX-1023
* VSX-2120
* VSX-S510

# Beware
This plugin is in an early alpha stadium and you use it on your own risk. 
I'm not responsible for any possible damages that occur on your health, hard- or software.

# License
MIT