const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  feature_name: { type: String, required: true },
  description: { type: String },
  type_packages: { type: String, enum: ["basic", "standard", "premium"] },
});

module.exports = mongoose.model("Feature", featureSchema);
