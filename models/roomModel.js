const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ["room", "flat", "house"],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  locationName: {
    type: String,
    required: true
  },
  address: {
    type: String
  },
  amenities: [String],
  images: [String],
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

roomSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Room", roomSchema);
