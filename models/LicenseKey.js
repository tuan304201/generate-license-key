const mongoose = require("mongoose");

const licenseKeySchema = new mongoose.Schema({
  license_key: { type: String, required: true, unique: true },
  issued_date: { type: Number, default: null },
  expiration_date: { type: Date, default: null },
  active_date: { type: Date, default: null },
  status: { type: String, enum: ["active", "inactive", "expired"], default: "inactive" },
  type_package: { type: String, enum: ["basic", "standard", "premium"] },
  license_type: { type: String, enum: ["perpetual", "annual"], required: true },
  is_perpetual: { type: Boolean, default: false },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  allowed_features: [
    {
      feature_id: { type: mongoose.Schema.Types.ObjectId, ref: "Feature", required: true },
      limits: { type: Number },
      usage: { type: Number, default: 0 },
      firstUsed: { type: Date, default: null },
      lastUsed: { type: Date, default: null },
      lastViolationMinute: { type: Date, default: null },
      status: { type: String, default: "active" },
      consecutiveViolations: { type: Number, default: 0 },
    },
  ],
  disabled_features: [
    {
      feature_id: { type: mongoose.Schema.Types.ObjectId, ref: "Feature", required: true },
      limits: { type: Number, required: true },
    },
  ],
  created_at: { type: Date, default: Date.now, immutable: true },
});

module.exports = mongoose.model("LicenseKey", licenseKeySchema);
