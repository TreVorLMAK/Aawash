const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    tenant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room"
    },
    checkInDate: {
        type: Date
    },
    checkOutDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ["Pending", "Confirmed", "Cancelled"],
        default: "Pending"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Booking", bookingSchema);
