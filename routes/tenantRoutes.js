const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");
const Room = require("../models/roomModel");

const router = express.Router();

router.get("/my-bookings", authMiddleware, authRoleMiddleware(["tenant"]), (req, res) => {
    res.json({ message: "Here are your bookings!" });
});

router.post("/book-room/:roomId", authMiddleware, authRoleMiddleware(["tenant"]), async (req, res) => {
    const { checkInDate, checkOutDate } = req.body;

    const newBooking = new Booking({
        tenant: req.user.id,
        room: req.params.roomId,
        checkInDate,
        checkOutDate
    });

    await newBooking.save();
    res.status(201).json({ message: "Room booked successfully!" });
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
