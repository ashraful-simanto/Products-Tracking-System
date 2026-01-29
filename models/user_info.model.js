const mongoose = require("mongoose");

const userInfoSchema = new mongoose.Schema({
  userType: {
    type: String,
    required: true,
    enum: ["customer", "shopkeeper", "distributor", "producer", "admin"],
  },
  nidNumber: {
    type: String, // Changed to String to preserve leading zeros
    trim: true,
  },
  mobile: {
    type: String, // Changed to String to preserve leading zeros
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 15,
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserInfo = mongoose.model("UserInfo", userInfoSchema);

module.exports = UserInfo;
