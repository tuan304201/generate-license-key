const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  license_key: { type: String },
});

module.exports = mongoose.model("User", userSchema);
