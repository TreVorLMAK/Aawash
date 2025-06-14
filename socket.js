const { Server } = require("socket.io");
const Message = require("./models/messageModel");

const users = {};
const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join", async ({ userId }) => {
      users[userId] = socket.id;
      io.emit("onlineUsers", Object.keys(users));

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

    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
      const isReceiverOnline = users[receiverId];

      const newMessage = new Message({
        senderId,
        receiverId,
        message,
        status: isReceiverOnline ? "Delivered" : "Sent",
        deliveredAt: isReceiverOnline ? new Date() : null,
      });

      await newMessage.save();

      io.to(socket.id).emit("receiveMessage", {
        senderId,
        receiverId,
        message,
        _id: newMessage._id,
        timestamp: newMessage.timestamp,
        self: true,
      });

      if (isReceiverOnline) {
        io.to(isReceiverOnline).emit("receiveMessage", {
          senderId,
          receiverId,
          message,
          _id: newMessage._id,
          timestamp: newMessage.timestamp,
        });
      }
    });

    socket.on("markAsRead", async ({ messageId }) => {
      const msg = await Message.findById(messageId);
      if (msg && msg.status !== "Read") {
        msg.status = "Read";
        msg.readAt = new Date();
        await msg.save();
      }
    });

    socket.on("disconnect", () => {
      const userId = Object.keys(users).find((key) => users[key] === socket.id);
      if (userId) {
        delete users[userId];
        io.emit("lastSeen", { userId, timestamp: new Date().toISOString() });
        io.emit("onlineUsers", Object.keys(users));
      }
    });
  });
};

module.exports = setupSocket;
