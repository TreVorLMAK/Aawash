const express = require("express");
const User = require("../models/userModel");
const Room = require("../models/roomModel");
const Booking = require("../models/bookingModel");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");

const router = express.Router();

// Must be logged in & admin
const protectAdmin = [authMiddleware, authRoleMiddleware(["admin"])];

router.get("/users", protectAdmin, async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

router.delete("/users/:id", protectAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "User deleted" });
});

router.get("/rooms", protectAdmin, async (req, res) => {
  const rooms = await Room.find().populate("owner", "firstName email");
  res.json(rooms);
});

router.delete("/rooms/:id", protectAdmin, async (req, res) => {
  await Room.findByIdAndDelete(req.params.id);
  res.json({ message: "Room deleted" });
});

router.get("/bookings", protectAdmin, async (req, res) => {
  const bookings = await Booking.find()
    .populate("tenant", "firstName email")
    .populate("room", "title");
  res.json(bookings);
});

module.exports = router;
