const express = require("express");
const Message = require("../models/messageModel");

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

module.exports = router;
