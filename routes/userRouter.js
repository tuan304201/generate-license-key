const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const LicenseKey = require("../models/LicenseKey");

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all user
 *       500:
 *         description: Server error
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).populate({
      path: "products.product",
      select: "product_name",
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /users/add:
 *   post:
 *     summary: Add a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: New name of the product
 *                 example: johndoe
 *     responses:
 *       200:
 *         description: User created successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/add", async (req, res) => {
  const { username } = req.body;

  try {
    // Kiểm tra xem username đã tồn tại chưa
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(200).json({ message: "User already exists" });
    }

    const newUser = new User({
      username,
      license_key: "",
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /users/update/{id}:
 *   put:
 *     summary: Update an existing user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: New username
 *                 example: Updated Username
 *     responses:
 *       200:
 *         description: Product successfully updated
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(id, { username }, { new: true });
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json(updatedUser);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * @swagger
 * /users/delete/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the user to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users successfully deleted
 *       404:
 *         description: Users not found
 *       500:
 *         description: Server error
 */
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });

    await LicenseKey.findOneAndDelete({ user_id: id }, { new: true });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - username
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID
 *         username:
 *           type: string
 *           description: Name of the product
 *       example:
 *         id: 607d1f77bcf86cd799439011
 *         username: Sample Product
 */

module.exports = router;
