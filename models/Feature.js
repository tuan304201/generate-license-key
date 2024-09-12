const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  feature_name: { type: String, required: true },
  description: { type: String },
  type_packages: { type: String, enum: ["basic", "standard", "premium"] },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
});

module.exports = mongoose.model("Feature", featureSchema);
