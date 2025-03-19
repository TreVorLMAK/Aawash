const { Server } = require("socket.io");
const Message = require("./models/messageModel");

const users = {}; 

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", //frontend url rakhney
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Store the user's socket ID
    socket.on("join", ({ userId }) => {
      users[userId] = socket.id;
      console.log(`User ${userId} joined with socket ID: ${socket.id}`);
    });

    // Handle messages
    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
      const newMessage = new Message({ senderId, receiverId, message });
      await newMessage.save();

      // Send message to receiver if online
      const receiverSocketId = users[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receiveMessage", { senderId, message });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      Object.keys(users).forEach((key) => {
        if (users[key] === socket.id) delete users[key];
      });
    });
  });
};

module.exports = setupSocket;
