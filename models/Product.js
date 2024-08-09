const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  description: { type: String },
});

module.exports = mongoose.model("Product", productSchema);
