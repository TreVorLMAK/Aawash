const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        profilePicture: { type: String, default: null },
        role: {
            type: String,
            enum: [
                "user", "owner", "admin"
            ],
            default: "user"
        },
        otp: {
            type: String
        },
        otpExpires: { type: Date },
        isVerified: { type: Boolean, default: false },
    },
    {
        timestamps: true
    });

module.exports = mongoose.model("User", userSchema);