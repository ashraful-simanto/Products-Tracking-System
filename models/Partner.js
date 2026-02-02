const mongoose = require("mongoose");

const PartnerItemSchema = new mongoose.Schema(
  {
    receiverMobile: {
      type: String,
      required: true,
    },
    partnerType: {
      type: String,
      enum: ["producer", "shopkeeper", "distributor"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "requested", "connected"],
      default: "pending",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const PartnerConnectionSchema = new mongoose.Schema(
  {
    // USER IDENTIFIED BY MOBILE NUMBER
    mobile: {
      type: String,
      required: true,
      unique: true, // acts as ID
      index: true,
    },

    role: {
      type: String,
      enum: ["producer", "shopkeeper", "distributor", "customer", "admin"],
      required: true,
    },

    partners: {
      type: [PartnerItemSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PartnerConnection", PartnerConnectionSchema);
