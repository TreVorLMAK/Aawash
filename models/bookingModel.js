const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },
  status: {
    type: String,
    enum: ["Applied", "Confirmed", "Rejected"],
    default: "Applied"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Booking", bookingSchema);
