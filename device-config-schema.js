module.exports = {
  title: "pimatic-pio-remote device config schemas",
  VolumeSensor: {
    title: "VolumeSensor config options",
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