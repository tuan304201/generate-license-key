const mongoose = require("mongoose");

const licenseKeySchema = new mongoose.Schema({
  license_key: { type: String, required: true, unique: true },
  issued_date: { type: Number, default: 1 },
  expiration_date: { type: Date, default: null },
  active_date: { type: Date, default: null },
  status: { type: String, enum: ["active", "inactive", "expired"], default: "inactive" },
  type_package: { type: String, enum: ["basic", "standard", "premium"] },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  created_at: { type: Date, default: Date.now, immutable: true },
});

module.exports = mongoose.model("LicenseKey", licenseKeySchema);
