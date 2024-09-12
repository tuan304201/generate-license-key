const express = require("express");
const bcrypt = require("bcrypt");
const moment = require("moment");

const LicenseKey = require("../models/LicenseKey");
const User = require("../models/User");
const Product = require("../models/Product");
const Feature = require("../models/Feature");

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
    const licenseKeys = await LicenseKey.find({}, { license_key: 0 })
      .populate("user_id", "username")
      .populate("product_id", "product_name");

    const now = new Date();

    for (const licenseKey of licenseKeys) {
      if (licenseKey.active_date === null) {
        licenseKey.status = "inactive";
      }
      if (licenseKey.expiration_date && licenseKey.expiration_date < now && licenseKey.is_perpetual === false) {
        licenseKey.status = "expired";
      }
      await licenseKey.save();
    }

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
 *       - name: product_name
 *         in: body
 *         required: true
 *         description: Tên sản phẩm cần kiểm tra license key
 *         schema:
 *           type: object
 *           properties:
 *             product_name:
 *               type: string
 *               description: Tên sản phẩm
 *     responses:
 *       200:
 *         description: Thông tin license key của người dùng cho sản phẩm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product_name:
 *                   type: string
 *                   description: Tên sản phẩm
 *                 license_key:
 *                   type: string
 *                   description: Khóa license
 *                 status:
 *                   type: string
 *                   description: Trạng thái của license key
 *                 expiration_date:
 *                   type: string
 *                   format: date-time
 *                   description: Ngày hết hạn của license key
 *       400:
 *         description: Thiếu username hoặc thông tin không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng, license key, hoặc sản phẩm không áp dụng
 *       401:
 *         description: License key không hợp lệ
 *       500:
 *         description: Lỗi server
 */

// Kiểm tra xem tài khoản đã kích hoạt hay chưa và còn hạn sử dụng không
router.post("/check/:username", async (req, res) => {
  const username = req.params.username;
  const { product_name } = req.body;
  try {
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const user = await User.findOne({ username }).populate({
      path: "products.product",
      select: "product_name -_id",
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const licenseKey = await LicenseKey.findOne({ user_id: user.id });

    if (!licenseKey) {
      return res.status(404).json({ error: "User has not been activated" });
    }

    const listProducts = user.products.map((product) => product);

    const foundProduct = listProducts.find((item) => item.product.product_name === product_name);

    if (!foundProduct) {
      return res.status(404).json({ error: "License key does not apply to this product" });
    }

    const isMatch = bcrypt.compare(foundProduct.license_key, licenseKey.license_key);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid license key" });
    }

    const now = new Date();

    if (licenseKey.expiration_date === null && licenseKey.is_perpetual) {
      licenseKey.status = "active";
    }

    if (licenseKey.expiration_date !== null && licenseKey.expiration_date < now) {
      licenseKey.status = "expired";
    }

    await licenseKey.save();

    res.json({
      product_name: foundProduct.product.product_name,
      license_key: foundProduct.license_key,
      status: licenseKey.status,
      expiration_date: licenseKey.expiration_date,
    });
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
   *             required:
   *               - user_id
   *               - product_id
   *               - type_package
   *               - license_type
   *               - issued_date
   *             properties:
   *               user_id:
   *                 type: string
   *                 description: ID của người dùng
   *               product_id:
   *                 type: string
   *                 description: ID của sản phẩm
   *               type_package:
   *                 type: string
   *                 enum: [basic, standard, premium]
   *                 description: Loại gói license
   *               license_type:
   *                 type: string
   *                 enum: [perpetual, annual]
   *                 description: Loại license (vĩnh viễn hoặc hàng năm)
   *               issued_date:
   *                 type: number
   *                 description: Số ngày kể từ ngày phát hành
   *               allowed_features:
   *                 type: array
   *                 description: Danh sách các tính năng được phép (chỉ cần cho license_type perpetual)
   *                 items:
   *                   type: object
   *                   properties:
   *                     feature_id:
   *                       type: string
   *                       description: ID của tính năng
   *                     limits:
   *                       type: number
   *                       description: Giới hạn sử dụng của tính năng
   *     responses:
   *       201:
   *         description: License key được tạo thành công
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 license_key:
   *                   type: string
   *                   description: License key đã tạo
   *                 issued_date:
   *                   type: number
   *                   description: Số ngày kể từ ngày phát hành
   *                 user_id:
   *                   type: string
   *                   description: ID của người dùng
   *                 product_id:
   *                   type: string
   *                   description: ID của sản phẩm
   *                 type_package:
   *                   type: string
   *                   enum: [basic, standard, premium]
   *                   description: Loại gói license
   *                 license_type:
   *                   type: string
   *                   enum: [perpetual, annual]
   *                   description: Loại license
   *                 is_perpetual:
   *                   type: boolean
   *                   description: Có phải license vĩnh viễn không
   *                 allowed_features:
   *                   type: array
   *                   description: Danh sách các tính năng được phép
   *                   items:
   *                     type: object
   *                     properties:
   *                       feature_id:
   *                         type: string
   *                         description: ID của tính năng
   *                       limits:
   *                         type: number
   *                         description: Giới hạn sử dụng của tính năng
   *                       usage:
   *                         type: number
   *                         description: Số lần sử dụng hiện tại
   *                       status:
   *                         type: string
   *                         description: Trạng thái của tính năng
   *       400:
   *         description: Loại gói không hợp lệ, loại license không hợp lệ, hoặc tính năng không có sẵn cho gói này
   *       404:
   *         description: Không tìm thấy người dùng hoặc sản phẩm
   *       500:
   *         description: Lỗi server
   */

  // Route để tạo license key
  router.post("/generate", async (req, res) => {
    const { user_id, product_id, type_package, license_type, issued_date, allowed_features } = req.body;

    if (!["basic", "standard", "premium"].includes(type_package)) {
      return res.status(400).json({ error: "Invalid package type" });
    }

    if (!["perpetual", "annual"].includes(license_type)) {
      return res.status(400).json({ error: "Invalid license type" });
    }

    try {
      const user = await User.findById(user_id);
      const product = await Product.findById(product_id);
      const feature = await Feature.find({});

      const featuresPackage = feature.filter((item) => item.type_packages === type_package);

      if (!user || !product) {
        return res.status(404).json({ error: "User or Product not found" });
      }

      const existingProduct = user.products.find((item) => item.product.toString() === product_id);

      if (existingProduct) {
        return res.status(200).json({ message: "User already has a license key for this product" });
      }

      if (license_type === "annual") {
        processedFeatures = featuresPackage.map((feature) => ({
          feature_id: feature._id,
          limits: null,
          usage: 0,
          firstUsed: null,
          lastUsed: null,
          lastViolationMinute: null,
          status: "active",
          consecutiveViolations: 0,
        }));
      }

      const featureId = featuresPackage.map((item) => item._id.toString());

      const allowedArray = allowed_features.map((item) => item.feature_id);

      const featureIdExists = allowedArray.every((id) => featureId.includes(id));

      if (!featureIdExists) {
        return res.status(400).json({ error: "Feature not available for this package" });
      }

      // Mã hoá License Key trước khi lưu vào database
      const saltRounds = Number(process.env.SALT_ROUNDS);
      const rawLicenseKey = generateLicenseKey();
      const salt = await bcrypt.genSalt(saltRounds);
      const hashedLicenseKey = await bcrypt.hash(rawLicenseKey, salt);

      user.products.push({
        product: product._id,
        license_key: rawLicenseKey,
      });

      await user.save();

      const licenseKey = new LicenseKey({
        license_key: hashedLicenseKey,
        issued_date,
        user_id: user._id,
        product_id: product._id,
        type_package,
        license_type,
        allowed_features: license_type === "perpetual" ? allowed_features : processedFeatures,
        is_perpetual: license_type === "perpetual" ? true : false,
      });

      const licenseKeyRes = new LicenseKey({
        license_key: rawLicenseKey,
        issued_date,
        user_id: user._id,
        product_id: product._id,
        type_package,
        license_type,
        allowed_features: license_type === "perpetual" ? allowed_features : processedFeatures,
        is_perpetual: license_type === "perpetual" ? true : false,
      });

      const updateUser = await User.findByIdAndUpdate(user.id, { license_key: rawLicenseKey }, { new: true });

      await licenseKey.save();
      await updateUser.save();

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
 *             required:
 *               - new_package
 *               - issued_date
 *               - license_type
 *             properties:
 *               new_package:
 *                 type: string
 *                 enum: [basic, standard, premium]
 *                 description: Gói license mới
 *               issued_date:
 *                 type: integer
 *                 description: Số ngày gia hạn kể từ ngày hiện tại
 *               license_type:
 *                 type: string
 *                 enum: [perpetual, annual]
 *                 description: Loại license (vĩnh viễn hoặc hàng năm)
 *               allowed_features:
 *                 type: array
 *                 description: Danh sách các tính năng được phép (chỉ cần cho license_type perpetual)
 *                 items:
 *                   type: object
 *                   properties:
 *                     feature_id:
 *                       type: string
 *                       description: ID của tính năng
 *                     limits:
 *                       type: number
 *                       description: Giới hạn sử dụng của tính năng
 *     responses:
 *       200:
 *         description: License key được nâng cấp thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: ID của license key
 *                 issued_date:
 *                   type: number
 *                   description: Số ngày kể từ ngày phát hành
 *                 expiration_date:
 *                   type: string
 *                   format: date-time
 *                   description: Ngày hết hạn của license key (nếu có)
 *                 active_date:
 *                   type: string
 *                   format: date-time
 *                   description: Ngày kích hoạt của license key (nếu có)
 *                 status:
 *                   type: string
 *                   enum: [active, inactive, expired]
 *                   description: Trạng thái hiện tại của license key
 *                 type_package:
 *                   type: string
 *                   enum: [basic, standard, premium]
 *                   description: Loại gói license
 *                 license_type:
 *                   type: string
 *                   enum: [perpetual, annual]
 *                   description: Loại license
 *                 is_perpetual:
 *                   type: boolean
 *                   description: Có phải license vĩnh viễn không
 *                 user_id:
 *                   type: string
 *                   description: ID của người dùng
 *                 product_id:
 *                   type: string
 *                   description: ID của sản phẩm
 *                 allowed_features:
 *                   type: array
 *                   description: Danh sách các tính năng được phép
 *                   items:
 *                     type: object
 *                     properties:
 *                       feature_id:
 *                         type: string
 *                         description: ID của tính năng
 *                       limits:
 *                         type: number
 *                         description: Giới hạn sử dụng của tính năng
 *                       usage:
 *                         type: number
 *                         description: Số lần sử dụng hiện tại
 *                       status:
 *                         type: string
 *                         description: Trạng thái của tính năng
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   description: Ngày tạo license key
 *       400:
 *         description: Loại gói không hợp lệ, loại license không hợp lệ, hoặc tính năng không có sẵn cho gói này
 *       404:
 *         description: Không tìm thấy license key
 *       500:
 *         description: Lỗi server
 */

// Route để nâng cấp gói license key
router.put("/upgrade/:id", async (req, res) => {
  const { new_package, issued_date, license_type, allowed_features } = req.body;
  const id = req.params.id;

  const now = moment();

  if (!["basic", "standard", "premium"].includes(new_package)) {
    return res.status(400).json({ error: "Invalid package type" });
  }

  if (!["perpetual", "annual"].includes(license_type)) {
    return res.status(400).json({ error: "Invalid license type" });
  }

  try {
    const licenseKey = await LicenseKey.findById(id);
    if (!licenseKey) {
      return res.status(404).json({ error: "License key not found" });
    }

    // Fetch features for the new package
    const features = await Feature.find({ type_packages: new_package });
    const featureIds = features.map((f) => f._id.toString());

    // Validate allowed_features if provided
    if (allowed_features && !allowed_features.every((f) => featureIds.includes(f.feature_id))) {
      return res.status(400).json({ error: "Invalid feature for the new package" });
    }

    // Update basic information
    licenseKey.type_package = new_package;
    licenseKey.license_type = license_type;

    // Update dates based on status and license type
    if (licenseKey.status === "expired" || licenseKey.status === "inactive") {
      licenseKey.status = "inactive";
      licenseKey.issued_date = issued_date;
      licenseKey.active_date = null;
      licenseKey.expiration_date = null;
    }
    if (licenseKey.status == "active") {
      if (license_type === "annual") {
        licenseKey.issued_date = licenseKey.issued_date + issued_date;
        licenseKey.expiration_date = licenseKey.expiration_date
          ? new Date(licenseKey.expiration_date.setFullYear(licenseKey.expiration_date.getFullYear() + issued_date))
          : now.toDate();
      } else {
        licenseKey.expiration_date = null;
      }
    }

    // Update allowed features
    if (license_type === "annual") {
      licenseKey.allowed_features = features.map((feature) => ({
        feature_id: feature._id,
        limits: null,
        usage: 0,
        firstUsed: null,
        lastUsed: null,
        lastViolationMinute: null,
        status: "active",
        consecutiveViolations: 0,
      }));
    } else if (allowed_features) {
      licenseKey.allowed_features = allowed_features;
    }

    licenseKey.is_perpetual = license_type === "perpetual";

    await licenseKey.save();

    const { license_key, ...licenseKeyResponse } = licenseKey.toObject();

    res.status(200).json(licenseKeyResponse);
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

    if (licenseKey.status === "active") {
      return res.status(409).json({ message: "License key is already active" });
    }

    if (!licenseKey) {
      return res.status(400).json({ error: "Invalid license key" });
    }

    const checkInfor = await LicenseKey.findOne({ user_id: checkUser.id, product_id: checkProduct.id });

    if (!checkInfor) {
      return res.status(404).json({ error: "The license key does not apply to this username or product" });
    }

    const now = new Date();
    const dateNow = new Date(now);

    const expirationDate = new Date(dateNow);
    expirationDate.setFullYear(expirationDate.getFullYear() + issued_date);

    const statusActive = "active";

    const updateExpired = await LicenseKey.findOneAndUpdate(
      { user_id: checkUser.id, product_id: checkProduct.id },
      {
        active_date: dateNow,
        expiration_date: licenseKey.license_type === "perpetual" ? null : expirationDate,
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
