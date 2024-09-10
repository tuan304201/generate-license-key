const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  feature_name: { type: String, required: true },
  description: { type: String },
});

module.exports = mongoose.model("Feature", featureSchema);
