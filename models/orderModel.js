const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    fromDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "WAITING",
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Room",
    },
    kosId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Kos",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
