const userSchema = new mongoose.Schema({
  name: {
    type: String,
    default: "",
    trim: true,
  },

  // ORIGINAL MOBILE (IMMUTABLE)
  mobile: {
    type: String,
    required: true,
    unique: true,
    immutable: true, // 🚫 cannot be changed
    match: [/^\+880\d{10}$/, "Invalid Bangladeshi mobile number"],
  },

  // ADDITIONAL MOBILE (NO COUNTRY CODE)
  altMobile: {
    type: String,
    default: null,
    match: [/^\d{10}$/, "Invalid mobile number"],
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["customer", "shopkeeper", "distributor", "producer", "admin"],
    required: true,
  },

  // NID (IMMUTABLE)
  nidNumber: {
    type: String,
    immutable: true, // 🚫 cannot be changed
    index: true,
    default: null,
  },

  description: {
    type: String,
    default: "",
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});
const UserUpInfo = mongoose.model("UserUpdatedInfo", userSchema);

module.exports = UserUpInfo;