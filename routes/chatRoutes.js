const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/conversations/:userId", async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    const recent = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$message" },
          lastTime: { $first: "$timestamp" },
        },
      },
      { $sort: { lastTime: -1 } },
    ]);

    const userIds = recent.map(r => r._id);
    const users = await User.find({ _id: { $in: userIds } }).select(
      "_id firstName lastName email profilePicture"
    );

    const conversations = recent.map(item => {
      const user = users.find(u => u._id.toString() === item._id.toString());
      return user ? {
        ...user._doc,
        lastMessage: item.lastMessage,
        lastTime: item.lastTime
      } : null;
    }).filter(Boolean);

    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations", error });
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
            { receiverId: userId },
          ],
        },
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$message" },
          lastTime: { $first: "$timestamp" },
        },
      },
      { $sort: { lastTime: -1 } },
    ]);

    res.json({ conversations: recent });
  } catch (error) {
    res.status(500).json({ message: "Error fetching recent chats", error });
  }
});

router.get("/unread/count", authMiddleware, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      status: { $in: ["Sent", "Delivered"] },
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread count", error });
  }
});

router.get("/unread", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      receiverId: req.user.id,
      status: { $in: ["Sent", "Delivered"] },
    }).sort({ timestamp: -1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching unread messages", error });
  }
});
router.get("/unread/:userId", async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);
    const unread = await Message.aggregate([
      { $match: { receiverId: userId, status: { $in: ["Sent", "Delivered"] } } },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);
    res.json(unread); // format: [{ _id: senderId, count: X }]
  } catch (err) {
    res.status(500).json({ message: "Failed to count unread", error: err.message });
  }
});
router.patch("/mark-read/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    await Message.updateMany(
      {
        senderId: user2,
        receiverId: user1,
        status: { $in: ["Sent", "Delivered"] },
      },
      {
        $set: { status: "Read", readAt: new Date() },
      }
    );
    res.json({ message: "Messages marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Error updating read status", error: err.message });
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
router.delete("/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    await Message.deleteMany({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    });
    res.json({ message: "Chat deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete chat", error: err.message });
  }
});


module.exports = router;
