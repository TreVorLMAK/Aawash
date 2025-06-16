const express = require("express");
const axios = require("axios");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");
const Room = require("../models/roomModel");
const Booking = require("../models/bookingModel");

require("dotenv").config();

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

router.post("/apply-booking/:roomId", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
  try {
    const { roomId } = req.params;

    
    const room = await Room.findById(roomId);
    if (!room || !room.isAvailable) {
      return res.status(404).json({ message: "Room not available" });
    }

    
    const existing = await Booking.findOne({
      tenant: req.user.id,
      room: roomId,
      status: { $in: ["Applied", "Confirmed"] }
    });

    if (existing) {
      return res.status(400).json({ message: "You have already applied for this room." });
    }

    
    const booking = new Booking({
      tenant: req.user.id,
      room: roomId,
      status: "Applied"
    });

    await booking.save();

    res.status(201).json({ message: "Booking request sent!", booking });
  } catch (error) {
    console.error("Apply booking error:", error);
    res.status(500).json({ message: "Error applying for booking", error });
  }
});

router.patch(
  "/bookings/:bookingId/pay",
  authMiddleware,
  authRoleMiddleware(["tenant"]),
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { token } = req.body;
      

      const booking = await Booking.findById(bookingId).populate("room");
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.tenant.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (booking.status !== "Approved") {
        return res.status(400).json({ message: "Booking is not approved" });
      }

      const expectedAmount = booking.room.price * 100;

      const response = await axios.post(
        "https://khalti.com/api/v2/payment/verify/",
        {
          token,
          amount: expectedAmount,
        },
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          },
        }
      );

      if (response.data && response.data.idx) {
        booking.status = "Paid";
        await booking.save();

        booking.room.isAvailable = false;
        await booking.room.save();

        await Booking.updateMany(
          {
            room: booking.room._id,
            _id: { $ne: booking._id },
            status: "Applied",
          },
          { $set: { status: "Rejected" } }
        );

        return res.json({
          message: "Payment verified and booking marked as Paid",
          booking,
        });
      } else {
        return res.status(400).json({ message: "Khalti verification failed" });
      }
    } catch (err) {
      console.error("Khalti verify error:", err.response?.data || err.message);
      return res
        .status(500)
        .json({ message: "Payment verification failed", error: err.message });
    }
  }
);
module.exports = router;
