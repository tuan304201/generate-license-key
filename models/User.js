const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      license_key: { type: String },
    },
  ],
});

userSchema.index({ username: 1, "products.product": 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
