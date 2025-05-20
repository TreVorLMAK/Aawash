const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");
const Room = require("../models/roomModel");
const Booking = require("../models/bookingModel");

const router = express.Router();

router.get("/my-bookings", authMiddleware, authRoleMiddleware(["tenant"]), (req, res) => {
    res.json({ message: "Here are your bookings!" });
});

router.post("/book-room/:roomId", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
    try {
      const { checkInDate, checkOutDate } = req.body;
      const roomId = req.params.roomId;
  
      // Check if room exists and is available
      const room = await Room.findById(roomId);
      if (!room || !room.isAvailable) {
        return res.status(404).json({ message: "Room not found or unavailable" });
      }
  
      // Optional: Prevent overlapping bookings
      const existingBooking = await Booking.findOne({
        room: roomId,
        $or: [
          { checkInDate: { $lte: new Date(checkOutDate), $gte: new Date(checkInDate) } },
          { checkOutDate: { $gte: new Date(checkInDate), $lte: new Date(checkOutDate) } }
        ]
      });
  
      if (existingBooking) {
        return res.status(409).json({ message: "Room already booked for those dates" });
      }
  
      const newBooking = new Booking({
        tenant: req.user.id,
        room: roomId,
        checkInDate,
        checkOutDate,
        status: "Pending"
      });
  
      await newBooking.save();
  
      res.status(201).json({ message: "Room booked successfully!", booking: newBooking });
    } catch (error) {
      console.error("Booking error:", error);
      res.status(500).json({ message: "Error booking room", error });
    }
  });  

router.get("/filter-rooms", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
    const { longitude, latitude, maxDistance } = req.query;

    const rooms = await Room.find({
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [parseFloat(longitude), parseFloat(latitude)]
                },
                $maxDistance: parseInt(maxDistance)
            }
        }
    });

    res.json(rooms);
});

module.exports = router;
