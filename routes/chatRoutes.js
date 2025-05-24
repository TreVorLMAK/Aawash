const express = require("express");
const Message = require("../models/messageModel");
const authMiddleware = require("../middleware/authMiddleware");


const router = express.Router();

// Fetch chat history between two users
router.get("/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).sort("timestamp");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages", error });
  }
});


router.get("/unread", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      receiverId: req.user.id,
      status: { $in: ["Sent", "Delivered"] }
    }).sort({ timestamp: -1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread messages", error });
  }
});


router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message || message.receiverId !== req.user.id) {
      return res.status(404).json({ message: "Message not found or access denied" });
    }

    message.status = "Read";
    message.readAt = new Date();
    await message.save();

    res.json({ message: "Message marked as read", data: message });
  } catch (error) {
    res.status(500).json({ message: "Error updating message status", error });
  }
});

router.get("/unread/count", authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      status: { $in: ["Sent", "Delivered"] }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread count", error });
  }
});


module.exports = router;
