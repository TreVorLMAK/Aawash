const express = require("express");
const Room = require("../models/roomModel");

const router = express.Router();

router.get("/map-rooms", async (req, res) => {
  try {
    const rooms = await Room.find({ isAvailable: true }).select(
      "title price category location locationName images"
    );
    res.json({ rooms });
  } catch (err) {
    console.error("Error fetching map rooms:", err);
    res.status(500).json({ message: "Failed to load map rooms" });
  }
});

module.exports = router;