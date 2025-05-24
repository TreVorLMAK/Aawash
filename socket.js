const { Server } = require("socket.io");
const Message = require("./models/messageModel");

const users = {};

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", async ({ userId }) => {
      users[userId] = socket.id;
      console.log(`User ${userId} joined with socket ID: ${socket.id}`);

      const pendingMessages = await Message.find({
        receiverId: userId,
        status: "Sent"
      });

      pendingMessages.forEach(async (msg) => {
        io.to(socket.id).emit("receiveMessage", {
          senderId: msg.senderId,
          message: msg.message,
          _id: msg._id
        });

        msg.status = "Delivered";
        msg.deliveredAt = new Date();
        await msg.save();
      });
    });

    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
      const isReceiverOnline = users[receiverId];
      const newMessage = new Message({
        senderId,
        receiverId,
        message,
        status: isReceiverOnline ? "Delivered" : "Sent",
        deliveredAt: isReceiverOnline ? new Date() : null
      });
      await newMessage.save();

      if (isReceiverOnline) {
        io.to(isReceiverOnline).emit("receiveMessage", {
          senderId,
          message,
          _id: newMessage._id
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
      console.log("User disconnected:", socket.id);
      Object.keys(users).forEach((key) => {
        if (users[key] === socket.id) delete users[key];
      });
    });
  });
};

module.exports = setupSocket;
