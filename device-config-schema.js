module.exports = {
  title: "pimatic-pio-remote device config schemas",
  AVRSensor: {
    title: "AVRSensor config options",
    type: "object",
    extensions: ["xAttributeOptions"],
    properties: {
      attributes: {
        description: "Attributes of the device",
        type: "array"
      }
    }
  }
};