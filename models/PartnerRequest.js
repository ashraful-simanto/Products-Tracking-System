const mongoose = require("mongoose");

const PartnerRequestSchema = new mongoose.Schema({
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ["producer", "shopkeeper", "distributor", "customer", "admin"],
      required: true,
    },
    mobile: { type: String, required: true },
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["producer", "shopkeeper", "distributor"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "connected", "requested"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PartnerRequest", PartnerRequestSchema);
