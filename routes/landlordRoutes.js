const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");
const Room = require("../models/roomModel");
const Booking = require("../models/bookingModel");
const upload = require("../middleware/multer");

const router = express.Router();

// Get landlord's rooms
router.get("/my-rooms", authMiddleware, authRoleMiddleware(["landlord"]), async (req, res) => {
  try {
    const rooms = await Room.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ rooms });
  } catch (err) {
    console.error("Error fetching landlord rooms:", err);
    res.status(500).json({ message: "Failed to fetch rooms", error: err });
  }
});

// Add a new room
router.post(
  "/add-room",
  authMiddleware,
  authRoleMiddleware(["landlord"]),
  upload.array("images", 5),
  async (req, res) => {
    try {
      const {
        title,
        description,
        price,
        location,
        category,
        amenities,
        locationName,
      } = req.body;

      if (!title || !price || !location || !locationName || !category) {
        return res.status(400).json({
          message: "Title, price, location, category and locationName are required.",
        });
      }

      const parsedLocation = JSON.parse(location);
      const imageUrls = req.files.map((file) => file.path);

      const newRoom = new Room({
        owner: req.user.id,
        title,
        description,
        price,
        location: parsedLocation,
        locationName,
        category,
        amenities: Array.isArray(amenities) ? amenities : [amenities],
        images: imageUrls,
      });

      await newRoom.save();

      res.status(201).json({
        message: "Room added successfully!",
        room: newRoom,
      });
    } catch (error) {
      console.error("Error adding room:", error);
      res.status(500).json({
        message: "Room validation or upload failed",
        error: error.message,
      });
    }
  }
);

// View bookings made on landlord’s rooms
router.get("/bookings", authMiddleware, authRoleMiddleware(["landlord"]), async (req, res) => {
  try {
    const rooms = await Room.find({ owner: req.user.id }).select("_id");
    const roomIds = rooms.map((room) => room._id);

    const bookings = await Booking.find({ room: { $in: roomIds } })
      .populate("room", "title price location")
      .populate("tenant", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (error) {
    console.error("Error fetching landlord bookings:", error);
    res.status(500).json({ message: "Error fetching bookings", error });
  }
});

router.delete("/delete-room/:id", authMiddleware, authRoleMiddleware(["landlord"]), async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ _id: id, owner: req.user.id });
    if (!room) {
      return res.status(404).json({ message: "Room not found or unauthorized" });
    }

    await room.deleteOne();
    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting room", error });
  }
});

router.patch(
  "/bookings/:bookingId",
  authMiddleware,
  authRoleMiddleware(["landlord"]),
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const booking = await Booking.findById(bookingId).populate("room");
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.room.owner.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      booking.status = status;
      await booking.save();

      res.json({ message: `Booking ${status.toLowerCase()}!`, booking });
    } catch (err) {
      console.error("Update booking error:", err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

module.exports = router;
