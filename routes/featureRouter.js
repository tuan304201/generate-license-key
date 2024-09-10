const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Feature = require("../models/Feature");

// Lấy danh sách tất cả các tính năng (features)
router.get("/", async (req, res) => {
  try {
    const features = await Feature.find({});
    res.json(features);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thêm tính năng mới cho một sản phẩm
router.post("/add", async (req, res) => {
  const { feature_name, description, product_id, limits, usage } = req.body;

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
    });

    await newFeature.save();

    existingProduct.features.push(newFeature._id);
    await existingProduct.save();

    res.status(201).json(newFeature);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cập nhật thông tin của một tính năng
router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { feature_name, description, limits } = req.body;

  try {
    const updatedFeature = await Feature.findByIdAndUpdate(
      id,
      { feature_name, description, limits }, // Cập nhật giới hạn (limits) nếu có
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

module.exports = router;
