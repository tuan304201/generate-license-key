const mongoose = require("mongoose");
const SALT_ROUNDS = process.env.SALT_ROUNDS;

const accountAdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

module.exports = mongoose.model("AccountAdmin", accountAdminSchema);
