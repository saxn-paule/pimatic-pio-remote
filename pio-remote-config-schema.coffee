# #pio-remote configuration options
# Declare your config option for your plugin here.
module.exports = {
  title: "pio remote config options"
  type: "object"
  properties:
    host:
      description: "AVR IP address"
      type: "string"
      default: "192.168.0.15"
    port:
      description: "AVR telnet port"
      type: "integer"
      default: 23
    maxVolume:
      description: "max Volume"
      type: "integer"
      default: 100
    brand:
      description: "AVR brand"
      type: "string"
      default: "pioneer"
    logLevel:
      description: "The log level"
      type: "string"
      default: "info"
}