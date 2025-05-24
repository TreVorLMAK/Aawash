const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");
const Room = require("../models/roomModel");
const Booking = require("../models/bookingModel");

const router = express.Router();

router.get("/my-bookings", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
    try {
      const bookings = await Booking.find({ tenant: req.user.id })
        .populate("room", "title price location images")
        .sort({ createdAt: -1 }); // latest bookings first
  
      res.json({ bookings });
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Error fetching bookings", error });
    }
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

router.patch("/bookings/:bookingId/cancel", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
    try {
      const { bookingId } = req.params;
  
      const booking = await Booking.findById(bookingId);
  
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
  
      if (booking.tenant.toString() !== req.user.id) {
        return res.status(403).json({ message: "You can only cancel your own bookings" });
      }

      if (booking.status !== "Pending") {
        return res.status(400).json({ message: "Only pending bookings can be cancelled" });
      }
  
      booking.status = "Cancelled";
      await booking.save();

      if (booking.status === "Confirmed") {
        const room = await Room.findById(booking.room);
        room.isAvailable = true;
        await room.save();
      }
  
      res.json({ message: "Booking cancelled successfully", booking });
    } catch (error) {
      console.error("Cancel booking error:", error);
      res.status(500).json({ message: "Error cancelling booking", error });
    }
  });
  

module.exports = router;
