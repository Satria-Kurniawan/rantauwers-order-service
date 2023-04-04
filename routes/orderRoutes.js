const express = require("express");
const router = express.Router();
const {
  insertOrder,
  getOrdersByCustomer,
  getOrder,
  getOrdersPerKos,
  verifyOrder,
} = require("../controllers/orderController");
const { withAuth, withRoleAdmin } = require("../middlewares/auth");

router.post("/:kosId/:roomId/insert", withAuth, insertOrder);
router.get("/customer", withAuth, getOrdersByCustomer);
router.get("/:orderId", withAuth, getOrder);
router.get("/:kosSlug/all", [withAuth, withRoleAdmin], getOrdersPerKos);
router.put("/:orderId/verify", [withAuth, withRoleAdmin], verifyOrder);

module.exports = router;
