// scripts/migrateMessages.js
require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/messageModel");

const MONGO_URI = process.env.DB_URL;

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const messages = await Message.find({
    $or: [
      { senderId: { $type: "string" } },
      { receiverId: { $type: "string" } }
    ]
  });

  console.log(`Found ${messages.length} messages to migrate.`);

  for (const msg of messages) {
    try {
      msg.senderId = new mongoose.Types.ObjectId(msg.senderId);
      msg.receiverId = new mongoose.Types.ObjectId(msg.receiverId);
      await msg.save();
      console.log(`✅ Migrated: ${msg._id}`);
    } catch (err) {
      console.error(`❌ Failed to migrate message ${msg._id}:`, err.message);
    }
  }

  console.log("🎉 Migration complete.");
  process.exit();
}

migrate().catch((err) => {
  console.error("❌ Migration error:", err);
  process.exit(1);
});
