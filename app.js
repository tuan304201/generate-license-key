const express = require("express");
const mongoose = require("mongoose");
var cors = require("cors");

const licenseKeyRoutes = require("./routes/licenseKeyRoutes");
const userRouter = require("./routes/userRouter");
const productRouter = require("./routes/productRouter");
const featureRouter = require("./routes/featureRouter");
const authRouter = require("./routes/authRouter");
const authenticateToken = require("./middleware/authenticateToken");
const swaggerDocs = require("./swagger");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
swaggerDocs(app);

// Kết nối tới MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Sử dụng các route
app.use("/api", authRouter);
app.use("/api/license-keys", authenticateToken, licenseKeyRoutes);
app.use("/api/users", userRouter);
app.use("/api/products", authenticateToken, productRouter);
app.use("/api/features", authenticateToken, featureRouter);

// Khởi động server
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
