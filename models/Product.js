const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  description: { type: String },
  features: [{ type: mongoose.Schema.Types.ObjectId, ref: "Feature" }],
});

module.exports = mongoose.model("Product", productSchema);
