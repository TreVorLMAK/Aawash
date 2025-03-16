const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authRoleMiddleware = require("../middleware/authRoleMiddleware");
const Room = require("../models/roomModel");

const router = express.Router();

router.post("/list-room", authMiddleware, authRoleMiddleware(["landlord"]), (req, res) => {
    res.json({ message: "Room listed successfully!" });
});

router.post("/add-room", authMiddleware, authRoleMiddleware(["landlord"]), async (req, res) => {
    const { title, description, price, location, amenities, images } = req.body;

    const newRoom = new Room({
        owner: req.user.id,
        title,
        description,
        price,
        location,
        amenities,
        images
    });

    await newRoom.save();
    res.status(201).json({ message: "Room added successfully!" });
});

module.exports = router;
