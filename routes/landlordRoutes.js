const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");
const Room = require("../models/roomModel");
const upload = require("../middleware/multer");
const Booking = require("../models/bookingModel");

const router = express.Router();

router.post("/list-room", authMiddleware, authRoleMiddleware(["landlord"]), (req, res) => {
    res.json({ message: "Room listed successfully!" });
});

router.post(
    "/add-room",
    authMiddleware,
    authRoleMiddleware(["landlord"]),
    upload.array("images", 5),
    async (req, res) => {
      try {
        const { title, description, price, location, amenities } = req.body;
  
        if (!title || !price || !location) {
          return res.status(400).json({ message: "Title, price, and location are required." });
        }
  
        const parsedLocation = JSON.parse(location);
  
        const imageUrls = req.files.map((file) => file.path);
  
        const newRoom = new Room({
          owner: req.user.id,
          title,
          description,
          price,
          location: parsedLocation,
          amenities: amenities ? amenities.split(",") : [],
          images: imageUrls,
        });
  
        await newRoom.save();
  
        res.status(201).json({ message: "Room added successfully!", room: newRoom });
      } catch (error) {
        console.error("Error adding room:", error);
        res.status(500).json({ message: "Room validation or upload failed", error });
      }
    }
  );
  
  router.get("/bookings", authMiddleware, authRoleMiddleware(["landlord"]), async (req, res) => {
    try {
      const rooms = await Room.find({ owner: req.user.id }).select("_id");
      const roomIds = rooms.map(room => room._id);
  
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

  router.patch("/bookings/:bookingId", authMiddleware, authRoleMiddleware(["landlord"]), async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status } = req.body;
  
      if (!["Confirmed", "Cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Use Confirmed or Cancelled." });
      }
  
      const booking = await Booking.findById(bookingId).populate("room");
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
  
      if (booking.room.owner.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied: not your room" });
      }
  
      // Update booking status
      booking.status = status;
      await booking.save();
  
      res.json({ message: `Booking ${status.toLowerCase()} successfully`, booking });
    } catch (error) {
      console.error("Booking status update error:", error);
      res.status(500).json({ message: "Error updating booking", error });
    }
  });


module.exports = router;
