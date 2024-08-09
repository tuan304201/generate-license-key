const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const AccountAdmin = require("../models/AccountAdmin");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Account Admin
 *   description: Operations for managing admin accounts
 */

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new admin account
 *     tags: [Account Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username for the new account
 *                 example: adminUser
 *               password:
 *                 type: string
 *                 description: Password for the new account
 *                 example: strongPassword123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Username or password is missing, or username already exists
 *       500:
 *         description: Server error
 */
router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const existingUser = await AccountAdmin.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const saltRounds = Number(process.env.SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newAccount = new AccountAdmin({
      username,
      password: hashedPassword,
    });

    await newAccount.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login and get a JWT token
 *     tags: [Account Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username for login
 *                 example: adminUser
 *               password:
 *                 type: string
 *                 description: Password for login
 *                 example: strongPassword123
 *     responses:
 *       200:
 *         description: Successful login with JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await AccountAdmin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "30d",
    });
    res.status(200).json({ username, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     AccountAdmin:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: Username for the account
 *         password:
 *           type: string
 *           description: Password for the account
 *       example:
 *         username: adminUser
 *         password: strongPassword123
 */
