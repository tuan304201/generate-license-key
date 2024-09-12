const express = require("express");
const moment = require("moment");
const router = express.Router();
const Product = require("../models/Product");
const User = require("../models/User");
const LicenseKey = require("../models/LicenseKey");
const Feature = require("../models/Feature");

/**
 * @swagger
 * /features:
 *   get:
 *     summary: Lấy danh sách tất cả các tính năng
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tất cả các tính năng
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: ID của tính năng
 *                   feature_name:
 *                     type: string
 *                     description: Tên của tính năng
 *                   description:
 *                     type: string
 *                     description: Mô tả của tính năng
 *                   type_packages:
 *                     type: string
 *                     enum: [basic, standard, premium]
 *                     description: Loại gói mà tính năng này thuộc về
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Thông báo lỗi
 */
// Lấy danh sách tất cả các tính năng (features)
router.get("/", async (req, res) => {
  try {
    const features = await Feature.find({});
    return res.status(200).json(features);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /features/add:
 *   post:
 *     summary: Thêm một tính năng mới và liên kết với sản phẩm
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feature_name
 *               - product_id
 *               - type_package
 *             properties:
 *               feature_name:
 *                 type: string
 *                 description: Tên của tính năng mới
 *               description:
 *                 type: string
 *                 description: Mô tả của tính năng
 *               product_id:
 *                 type: string
 *                 description: ID của sản phẩm mà tính năng sẽ được liên kết
 *               type_package:
 *                 type: string
 *                 enum: [basic, standard, premium]
 *                 description: Loại gói mà tính năng này thuộc về
 *     responses:
 *       201:
 *         description: Tính năng mới đã được tạo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: ID của tính năng mới
 *                 feature_name:
 *                   type: string
 *                   description: Tên của tính năng
 *                 description:
 *                   type: string
 *                   description: Mô tả của tính năng
 *                 type_packages:
 *                   type: string
 *                   enum: [basic, standard, premium]
 *                   description: Loại gói mà tính năng này thuộc về
 *       404:
 *         description: Không tìm thấy sản phẩm
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Product not found
 *       409:
 *         description: Tính năng đã tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Feature already exists
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Thông báo lỗi
 */
// Thêm tính năng mới cho một sản phẩm
router.post("/add", async (req, res) => {
  const { feature_name, description, product_id, type_package } = req.body;

  try {
    // Kiểm tra sản phẩm có tồn tại hay không
    const existingProduct = await Product.findById(product_id);

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Kiểm tra xem tính năng đã tồn tại trong sản phẩm chưa
    const existingFeature = await Feature.findOne({ feature_name });

    if (existingFeature) {
      return res.status(409).json({ message: "Feature already exists" });
    }

    // Tạo tính năng mới và liên kết với sản phẩm
    const newFeature = new Feature({
      feature_name,
      description,
      type_packages: type_package,
    });

    await newFeature.save();

    existingProduct.features.push(newFeature._id);
    await existingProduct.save();

    res.status(201).json(newFeature);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /update/{id}:
 *   put:
 *     summary: Cập nhật một tính năng
 *     description: Cập nhật thông tin của một tính năng đã tồn tại trong hệ thống theo ID.
 *     tags:
 *       - Features
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tính năng cần cập nhật
 *       - in: body
 *         name: feature
 *         description: Thông tin cần cập nhật cho tính năng
 *         schema:
 *           type: object
 *           required:
 *             - feature_name
 *           properties:
 *             feature_name:
 *               type: string
 *               description: Tên tính năng
 *               example: "New Feature"
 *             description:
 *               type: string
 *               description: Mô tả về tính năng
 *               example: "This is a new feature."
 *             type_package:
 *               type: string
 *               enum: [basic, standard, premium]
 *               description: Gói của tính năng
 *               example: "standard"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   description: ID của tính năng
 *                 feature_name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 type_package:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Tính năng không tìm thấy
 *       500:
 *         description: Lỗi server
 */
// Cập nhật thông tin của một tính năng
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { feature_name, description, type_package } = req.body;

  try {
    const updatedFeature = await Feature.findByIdAndUpdate(
      id,
      { feature_name, description, type_package },
      { new: true },
    );

    if (!updatedFeature) {
      return res.status(404).json({ message: "Feature not found" });
    }

    res.status(200).json(updatedFeature);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /delete/{id}:
 *   delete:
 *     summary: Xóa một tính năng
 *     description: Xóa tính năng theo ID và cập nhật các sản phẩm liên quan.
 *     tags:
 *       - Features
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tính năng cần xóa
 *     responses:
 *       200:
 *         description: Xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Feature deleted successfully"
 *       404:
 *         description: Tính năng không tìm thấy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Feature not found"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

// Xóa một tính năng và cập nhật sản phẩm liên quan
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Xóa tính năng
    const deletedFeature = await Feature.findByIdAndDelete(id);
    if (!deletedFeature) {
      return res.status(404).json({ message: "Feature not found" });
    }

    // Cập nhật mảng features trong tất cả các sản phẩm liên quan
    await Product.updateMany(
      { features: id }, // Tìm sản phẩm có chứa feature với id đã xóa
      { $pull: { features: id } }, // Loại bỏ feature khỏi mảng features
    );

    res.status(200).json({ message: "Feature deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /count/{feature_id}:
 *   get:
 *     summary: Kiểm tra và cập nhật số lần sử dụng của một tính năng
 *     description: API này kiểm tra xem người dùng có quyền sử dụng tính năng và cập nhật số lần sử dụng của họ dựa trên license key.
 *     tags:
 *       - Features
 *     parameters:
 *       - in: path
 *         name: feature_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tính năng cần kiểm tra
 *       - in: body
 *         name: username
 *         description: Tên người dùng cần kiểm tra quyền sử dụng
 *         schema:
 *           type: object
 *           required:
 *             - username
 *           properties:
 *             username:
 *               type: string
 *               description: Tên đăng nhập của người dùng
 *               example: "john_doe"
 *     responses:
 *       200:
 *         description: Cập nhật số lần sử dụng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usage count updated successfully."
 *       400:
 *         description: Thiếu tên người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Username is required"
 *       403:
 *         description: Tính năng bị vô hiệu do vi phạm giới hạn sử dụng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Feature disabled due to repeated violations within 5 minutes."
 *       404:
 *         description: Không tìm thấy người dùng hoặc tính năng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

router.get("/count/:feature_id", async (req, res) => {
  const feature_id = req.params.feature_id;
  const { username } = req.body;

  try {
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const licenseKey = await LicenseKey.findOne({ user_id: user.id });
    if (!licenseKey && licenseKey.status !== "active") {
      return res.status(404).json({ error: "The user or license key has not been activated" });
    }

    // Tìm feature trong allowed_features
    const feature = licenseKey.allowed_features.find((item) => item.feature_id.toString() === feature_id);

    if (!feature) {
      return res.status(404).json({ error: "License key does not apply to this feature" });
    }

    if (feature.limits === null && licenseKey.is_perpetual === false && licenseKey.status === "active") {
      return res.status(200).json({ message: "Usage count updated successfully." });
    }

    const now = moment();
    const currentDay = now.startOf("day");
    const oneMonthAgo = moment().subtract(1, "months");

    if (!feature.firstUsed) {
      feature.firstUsed = now.toDate();
    }

    // Reset usage mỗi ngày
    if (moment(feature.lastUsed).startOf("day").isBefore(currentDay)) {
      feature.usage = 0; // Reset số lần sử dụng mỗi ngày
      feature.status = "active";
    }

    // Kiểm tra nếu vi phạm quá số lần cho phép
    if (feature.usage >= feature.limits + 1) {
      // Giới hạn là 5 lần, vi phạm khi lần thứ 6
      if (!feature.lastViolationMinute || moment(feature.lastViolationMinute).minute() !== currentDay) {
        feature.consecutiveViolations += 1;
        feature.status = "disabled";
        feature.lastViolationMinute = now.toDate(); // Lưu lại phút vi phạm cuối cùng

        if (feature.consecutiveViolations >= 2) {
          // Kiểm tra vi phạm có xảy ra trong 5 phút gần đây không
          const violationMinutesAgo = moment(feature.lastViolationMinute).isAfter(oneMonthAgo);

          if (violationMinutesAgo) {
            const violatedFeature = licenseKey.allowed_features.find(
              (item) => item.feature_id.toString() === feature_id,
            );
            if (violatedFeature) {
              licenseKey.allowed_features = licenseKey.allowed_features.filter(
                (item) => item.feature_id.toString() !== feature_id,
              );

              // Thêm vào disabled_features với feature_id và limits
              licenseKey.disabled_features.push({
                feature_id: violatedFeature.feature_id,
                limits: violatedFeature.limits, // Lưu giới hạn ban đầu
              });
              await licenseKey.save();
              return res.status(403).json({ message: "Feature disabled due to repeated violations within 5 minutes." });
            }
          }
        }

        await licenseKey.save();
      }

      return res.status(403).json({ message: "Feature has exceeded usage limit for this minute." });
    }

    // Reset consecutiveViolations nếu quá 5 phút và không vượt quá giới hạn vi phạm
    if (moment(feature.firstUsed).isBefore(oneMonthAgo)) {
      feature.consecutiveViolations = 0;
      feature.lastViolationMinute = null;
      feature.firstUsed = now.toDate();
      feature.status = "active";
    }

    // Nếu không vi phạm, tăng usage và cập nhật lastUsed
    feature.usage += 1;
    feature.lastUsed = now.toDate();

    await licenseKey.save();
    res.status(200).json({ message: "Usage count updated successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /restore-feature/{feature_id}:
 *   put:
 *     summary: Khôi phục một tính năng đã bị vô hiệu hóa
 *     description: API này khôi phục một tính năng từ danh sách các tính năng bị vô hiệu hóa và đưa nó trở lại danh sách các tính năng được phép sử dụng.
 *     tags:
 *       - Features
 *     parameters:
 *       - in: path
 *         name: feature_id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của tính năng cần khôi phục
 *       - in: body
 *         name: username
 *         description: Tên người dùng có license cần khôi phục tính năng
 *         schema:
 *           type: object
 *           required:
 *             - username
 *           properties:
 *             username:
 *               type: string
 *               description: Tên đăng nhập của người dùng
 *               example: "john_doe"
 *     responses:
 *       200:
 *         description: Khôi phục tính năng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Feature restored successfully"
 *       400:
 *         description: Thiếu tên người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Username is required"
 *       404:
 *         description: Không tìm thấy người dùng hoặc tính năng trong danh sách tính năng bị vô hiệu hóa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   examples:
 *                     userNotFound:
 *                       value: "User not found"
 *                     featureNotFound:
 *                       value: "Feature not found in disabled features"
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

router.put("/restore-feature/:feature_id", async (req, res) => {
  const feature_id = req.params.feature_id;
  const { username } = req.body;

  try {
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const licenseKey = await LicenseKey.findOne({ user_id: user.id });
    if (!licenseKey) {
      return res.status(404).json({ error: "User has not been activated" });
    }

    // Tìm tính năng trong disabled_features
    const disabledFeature = licenseKey.disabled_features.find((item) => item.feature_id.toString() === feature_id);

    if (!disabledFeature) {
      return res.status(404).json({ error: "Feature not found in disabled features" });
    }

    // Khôi phục tính năng với limits từ disabled_features
    licenseKey.allowed_features.push({
      feature_id: disabledFeature.feature_id,
      limits: disabledFeature.limits,
      usage: 0,
      firstUsed: null,
      lastUsed: null,
      consecutiveViolations: 0,
      status: "active",
    });

    // Xóa tính năng khỏi danh sách disabled_features
    licenseKey.disabled_features = licenseKey.disabled_features.filter(
      (item) => item.feature_id.toString() !== feature_id,
    );

    // Lưu thay đổi
    await licenseKey.save();

    res.status(200).json({ message: "Feature restored successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
