const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");
const Room = require("../models/roomModel");
const Booking = require("../models/bookingModel");

const router = express.Router();

// Get my bookings
router.get("/my-bookings", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
  try {
    const bookings = await Booking.find({ tenant: req.user.id })
      .populate("room", "title price location images")
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Error fetching bookings", error });
  }
});

// Book a room
router.post("/book-room/:roomId", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
  try {
    const { checkInDate, checkOutDate } = req.body;
    const room = await Room.findById(req.params.roomId);

    if (!room || !room.isAvailable) {
      return res.status(404).json({ message: "Room not found or unavailable" });
    }

    const overlap = await Booking.findOne({
      room: room._id,
      $or: [
        { checkInDate: { $lte: new Date(checkOutDate), $gte: new Date(checkInDate) } },
        { checkOutDate: { $gte: new Date(checkInDate), $lte: new Date(checkOutDate) } }
      ]
    });

    if (overlap) return res.status(409).json({ message: "Room already booked for those dates" });

    const booking = new Booking({
      tenant: req.user.id,
      room: room._id,
      checkInDate,
      checkOutDate,
      status: "Pending"
    });

    await booking.save();
    res.status(201).json({ message: "Room booked successfully!", booking });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ message: "Error booking room", error });
  }
});

// Cancel booking
router.patch("/bookings/:bookingId/cancel", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.tenant.toString() !== req.user.id) return res.status(403).json({ message: "Forbidden" });
    if (booking.status !== "Pending") return res.status(400).json({ message: "Only pending bookings can be cancelled" });

    booking.status = "Cancelled";
    await booking.save();
    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    res.status(500).json({ message: "Error cancelling booking", error });
  }
});

// Public room listing for tenants (supports filtering)
router.get("/public-rooms", async (req, res) => {
  try {
    const { minPrice, maxPrice, location, amenities } = req.query;
    const query = { isAvailable: true };

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    if (location) {
      query["title"] = { $regex: location, $options: "i" };
    }

    if (amenities) {
      const a = amenities.split(",");
      query.amenities = { $all: a };
    }

    const rooms = await Room.find(query).populate("owner", "firstName email");
    res.json({ rooms });
  } catch (err) {
    console.error("Filter error:", err);
    res.status(500).json({ message: "Failed to filter rooms", error: err.message });
  }
});

module.exports = router;
