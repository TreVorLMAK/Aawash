const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

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
        phone: {
            type: String,
            unique: true,
            sparse: true
        },
        password: {
            type: String,
            required: true
        },
        profilePicture: { type: String, default: null },
        role: {
            type: String,
            enum: ["tenant", "landlord", "admin"],
            default: "tenant"
        },
        verifyOtp: {
            type: String
        },
        verifyOtpExpires: { type: Number },
        isVerified: { type: Boolean, default: false },
        resetOtp: {
            type: String ,
            default: ''
        },
        resetOtpExpires: {
            type: String,
            default: 0
        }
    },
    {
        timestamps: true
    });

module.exports = mongoose.model("User", userSchema);