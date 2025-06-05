const express = require("express");
const Room = require("../models/roomModel");
const router = express.Router();

router.get("/public-rooms", async (req, res) => {
  try {
    const { minPrice, maxPrice, location, amenities, category } = req.query;
    const query = { isAvailable: true };

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseInt(minPrice);
      if (maxPrice) query.price.$lte = parseInt(maxPrice);
    }

    if (location) {
        query["locationName"] = { $regex: location, $options: "i" };
      }

    if (amenities) {
      const amenityArray = amenities.split(",");
      query.amenities = { $all: amenityArray };
    }

    if (category) {
        query.category = category;
      }      

    const rooms = await Room.find(query).populate("owner", "firstName email");

    res.json({ rooms });
  } catch (err) {
    console.error("Filter error:", err);
    res.status(500).json({ message: "Failed to filter rooms", error: err.message });
  }
});

router.get("/public-rooms/:id", async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate("owner", "firstName email");
    if (!room || !room.isAvailable) return res.status(404).json({ message: "Room not found" });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: "Error fetching room", error: err.message });
  }
});

module.exports = router;
