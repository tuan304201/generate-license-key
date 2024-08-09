const express = require("express");
const bcrypt = require("bcrypt");

const LicenseKey = require("../models/LicenseKey");
const User = require("../models/User");
const Product = require("../models/Product");

const router = express.Router();

// Hàm sinh license key
function generateLicenseKey() {
  const length = 16;
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    key += charset[randomIndex];
  }
  return key.match(/.{1,4}/g).join("-");
}

// Hàm getTime
function getLocalTimeInGMTPlus7() {
  const now = new Date();
  const localTimeInGMTPlus7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return localTimeInGMTPlus7;
}

/**
 * @swagger
 * tags:
 *   name: License Keys
 *   description: Operations about license keys
 */

/**
 * @swagger
 * /license-keys:
 *   get:
 *     summary: Lấy tất cả license key
 *     tags: [License Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tất cả license key
 *       500:
 *         description: Lỗi server
 */

// Route get all licenses key
router.get("/", async (req, res) => {
  try {
    const licenseKeys = await LicenseKey.find({}, { license_key: 0 });
    const now = getLocalTimeInGMTPlus7();

    licenseKeys.forEach(async (licenseKey) => {
      if (!licenseKey.expiration_date) {
        licenseKey.status = "inactive";
        await licenseKey.save();
      }

      if (licenseKey.expiration_date < now) {
        licenseKey.status = "expired";
        await licenseKey.save();
      }
    });

    res.json(licenseKeys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /license-keys/check/{username}:
 *   post:
 *     summary: Kiểm tra thời hạn license key của người dùng
 *     tags: [License Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: username
 *         in: path
 *         required: true
 *         description: Tên người dùng
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin license key của người dùng
 *       404:
 *         description: Không tìm thấy người dùng hoặc license key
 *       500:
 *         description: Lỗi server
 */

// Kiểm tra xem tài khoản đã kích hoạt hay chưa và còn hạn sử dụng không
router.post("/check/:username", async (req, res) => {
  const username = req.params.username;
  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = user.id;

    const licenseKey = await LicenseKey.findOne({ user_id: userId });

    if (!licenseKey) {
      return res.status(404).json({ error: "User has not been activated" });
    }

    const now = await getLocalTimeInGMTPlus7();

    if (licenseKey.expiration_date < now) {
      licenseKey.status = "expired";
      await licenseKey.save();
    }

    res.json(licenseKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}),
  /**
   * @swagger
   * /license-keys/generate:
   *   post:
   *     summary: Tạo license key mới
   *     tags: [License Keys]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               user_id:
   *                 type: string
   *                 description: ID của người dùng
   *               product_id:
   *                 type: string
   *                 description: ID của sản phẩm
   *               type_package:
   *                 type: string
   *                 enum:
   *                   - basic
   *                   - standard
   *                   - premium
   *                 description: Loại gói license
   *               issued_date:
   *                 type: integer
   *                 description: Số ngày kể từ ngày phát hành
   *     responses:
   *       201:
   *         description: License key được tạo thành công
   *       400:
   *         description: Loại gói không hợp lệ hoặc dữ liệu không hợp lệ
   *       404:
   *         description: Không tìm thấy người dùng hoặc sản phẩm
   *       500:
   *         description: Lỗi server
   */

  // Route để tạo license key
  router.post("/generate", async (req, res) => {
    const { user_id, product_id, type_package, issued_date } = req.body;

    if (!["basic", "standard", "premium"].includes(type_package)) {
      return res.status(400).json({ error: "Invalid package type" });
    }

    try {
      const user = await User.findById(user_id);
      const product = await Product.findById(product_id);

      if (!user || !product) {
        return res.status(404).json({ error: "User or Product not found" });
      }

      // Mã hoá License Key trước khi lưu vào database
      const saltRounds = Number(process.env.SALT_ROUNDS);
      const rawLicenseKey = generateLicenseKey();
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedLicenseKey = await bcrypt.hash(rawLicenseKey, salt);

      // Múi giờ +7 bằng phút
      const now = getLocalTimeInGMTPlus7();
      const expirationDate = new Date(now.getTime() + issued_date * 60 * 5000);
      // const expirationDate = new Date(now);
      // expirationDate.setFullYear(now.getFullYear() + issued_date);

      const licenseKey = new LicenseKey({
        license_key: hashedLicenseKey,
        issued_date,
        user_id: user._id,
        product_id: product._id,
        type_package,
      });

      const licenseKeyRes = new LicenseKey({
        license_key: rawLicenseKey,
        issued_date,
        user_id: user._id,
        product_id: product._id,
        type_package,
      });

      const updateUser = await User.findByIdAndUpdate(user.id, { license_key: rawLicenseKey }, { new: true });

      await updateUser.save();
      await licenseKey.save();

      res.status(201).json(licenseKeyRes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

/**
 * @swagger
 * /license-keys/upgrade/{id}:
 *   put:
 *     summary: Nâng cấp gói license key
 *     tags: [License Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID của license key cần nâng cấp
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_package:
 *                 type: string
 *                 enum:
 *                   - basic
 *                   - standard
 *                   - premium
 *                 description: Gói license mới
 *               issued_date:
 *                 type: integer
 *                 description: Số ngày gia hạn kể từ ngày hiện tại
 *               status:
 *                 type: string
 *                 enum:
 *                   - active
 *                   - inactive
 *                   - expired
 *     responses:
 *       200:
 *         description: License key được nâng cấp thành công
 *       400:
 *         description: Loại gói hoặc status không hợp lệ
 *       404:
 *         description: Không tìm thấy license key
 *       500:
 *         description: Lỗi server
 */

// Route để nâng cấp gói license key
router.put("/upgrade/:id", async (req, res) => {
  const { new_package, issued_date } = req.body;
  const id = req.params.id;

  if (!["basic", "standard", "premium"].includes(new_package)) {
    return res.status(400).json({ error: "Invalid package type or status" });
  }

  try {
    const licenseKey = await LicenseKey.findById(id);

    if (!licenseKey) {
      return res.status(404).json({ error: "License key not found" });
    }

    licenseKey.type_package = new_package;
    licenseKey.issued_date = issued_date;

    await licenseKey.save();
    res.status(200).json(licenseKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /license-keys/active:
 *   post:
 *     summary: Kích hoạt license key
 *     tags: [License Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Tên người dùng đã mua license
 *                 example: johndoe
 *               product_name:
 *                 type: string
 *                 description: Tên sản phẩm áp dụng license
 *                 example: MyProduct
 *               license_key:
 *                 type: string
 *                 description: License key để kích hoạt
 *                 example: XXXXX-XXXXX-XXXXX-XXXXX
 *     responses:
 *       200:
 *         description: Kích hoạt thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Kích hoạt thành công
 *       400:
 *         description: License key không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng hoặc sản phẩm tương ứng với license key
 *       500:
 *         description: Lỗi server
 */

// Route để kích hoạt/không kích hoạt license key
router.post("/active", async (req, res) => {
  const { username, product_name, license_key } = req.body;

  try {
    const checkUser = await User.findOne({ username: username });
    const checkProduct = await Product.findOne({ product_name: product_name });

    if (!checkUser) {
      return res.status(404).json({ error: "The user has not purchased a license" });
    }

    if (!checkProduct) {
      return res.status(404).json({ error: "License key does not apply to this product" });
    }

    const licenseKeys = await LicenseKey.find();

    let licenseKey = null;
    for (const key of licenseKeys) {
      const isMatch = await bcrypt.compare(license_key, key.license_key);
      if (isMatch) {
        licenseKey = key;
        break;
      }
    }

    const issued_date = licenseKey.issued_date;

    if (!licenseKey) {
      return res.status(400).json({ error: "Invalid license key" });
    }

    const checkInfor = await LicenseKey.findOne({ user_id: checkUser.id, product_id: checkProduct.id });

    if (!checkInfor) {
      return res.status(404).json({ error: "The license key does not apply to this username or product" });
    }

    const now = getLocalTimeInGMTPlus7();
    const statusActive = "active";

    const updateExpired = await LicenseKey.findOneAndUpdate(
      { user_id: checkUser.id, product_id: checkProduct.id },
      {
        active_date: now,
        expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + issued_date)),
        status: statusActive,
      },
      { new: true },
    );

    await updateExpired.save();

    const active_date = updateExpired.active_date;
    const expiration_date = updateExpired.expiration_date;
    const status = updateExpired.status;

    res.status(200).json({ message: "Kích hoạt thành công", active_date, expiration_date, status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     LicenseKey:
 *       type: object
 *       required:
 *         - license_key
 *         - issued_date
 *         - expiration_date
 *         - user_id
 *         - product_id
 *         - type_package
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID
 *         license_key:
 *           type: string
 *           description: License key
 *         issued_date:
 *           type: integer
 *           description: Số ngày kể từ ngày phát hành
 *         expiration_date:
 *           type: string
 *           format: date-time
 *           description: Ngày hết hạn
 *         user_id:
 *           type: string
 *           description: ID của người dùng
 *         product_id:
 *           type: string
 *           description: ID của sản phẩm
 *         type_package:
 *           type: string
 *           description: Loại gói license
 *       example:
 *         id: 607d1f77bcf86cd799439012
 *         license_key: ABCDEFGHIJKLMNOP
 *         issued_date: 30
 *         expiration_date: 2024-12-31T23:59:59Z
 *         user_id: 607d1f77bcf86cd799439010
 *         product_id: 607d1f77bcf86cd799439011
 *         type_package: standard
 */
