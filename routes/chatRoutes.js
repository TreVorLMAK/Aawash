const express = require("express");
const Message = require("../models/messageModel");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
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

router.get("/recent/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const recent = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userId] },
              "$receiverId",
              "$senderId"
            ]
          },
          lastMessage: { $first: "$message" },
          lastTime: { $first: "$timestamp" }
        }
      },
      {
        $sort: { lastTime: -1 }
      }
    ]);

    res.json({ conversations: recent });
  } catch (error) {
    res.status(500).json({ message: "Error fetching recent chats", error });
  }
});

router.get("/conversations/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    const userIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderId !== userId) userIds.add(msg.senderId);
      if (msg.receiverId !== userId) userIds.add(msg.receiverId);
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select(
      "_id firstName lastName email profilePicture"
    );

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to load conversations", error: err.message });
  }
});

module.exports = router;
