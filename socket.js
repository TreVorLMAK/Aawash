const { Server } = require("socket.io");
const Message = require("./models/messageModel");

const users = {}; // Maps userId → socket.id

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ New connection:", socket.id);

    // JOIN: Save userId ↔ socket.id
    socket.on("join", async ({ userId }) => {
      users[userId] = socket.id;
      console.log(`🟢 User ${userId} joined with socket ID ${socket.id}`);
      console.log("Current online users:", users);

      // Deliver any pending messages
      const pendingMessages = await Message.find({
        receiverId: userId,
        status: "Sent",
      });

      for (const msg of pendingMessages) {
        io.to(socket.id).emit("receiveMessage", {
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          message: msg.message,
          _id: msg._id,
          timestamp: msg.timestamp,
        });

        msg.status = "Delivered";
        msg.deliveredAt = new Date();
        await msg.save();
      }
    });

    // SEND MESSAGE
    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
      console.log("📨 New message request received:");
      console.log("From:", senderId);
      console.log("To:", receiverId);
      console.log("Message:", message);

      const isReceiverOnline = users[receiverId];
      console.log("Is receiver online?", isReceiverOnline ? "Yes" : "No");

      const newMessage = new Message({
        senderId,
        receiverId,
        message,
        status: isReceiverOnline ? "Delivered" : "Sent",
        deliveredAt: isReceiverOnline ? new Date() : null,
      });

      await newMessage.save();
      console.log("💾 Message saved to DB:", newMessage._id);

      // ✅ Always send back to sender
      io.to(socket.id).emit("receiveMessage", {
        senderId,
        receiverId,
        message,
        _id: newMessage._id,
        timestamp: newMessage.timestamp,
        self: true,
      });

      // ✅ Also send to receiver if online
      if (isReceiverOnline) {
        io.to(isReceiverOnline).emit("receiveMessage", {
          senderId,
          receiverId,
          message,
          _id: newMessage._id,
          timestamp: newMessage.timestamp,
        });
        console.log("📤 Delivered to receiver's socket:", users[receiverId]);
      }
    });

    // MARK MESSAGE AS READ
    socket.on("markAsRead", async ({ messageId }) => {
      const msg = await Message.findById(messageId);
      if (msg && msg.status !== "Read") {
        msg.status = "Read";
        msg.readAt = new Date();
        await msg.save();
        console.log("✅ Marked message as read:", messageId);
      }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      console.log("🔌 User disconnected:", socket.id);
      Object.keys(users).forEach((key) => {
        if (users[key] === socket.id) {
          console.log(`🗑️ Removing user ${key} from online list`);
          delete users[key];
        }
      });
    });
  });
};

module.exports = setupSocket;
