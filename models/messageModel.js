const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Sent", "Delivered", "Read"],
    default: "Sent"
  },
  deliveredAt: Date,
  readAt: Date
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
