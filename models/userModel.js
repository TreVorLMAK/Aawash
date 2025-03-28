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
            enum: [
                "user", "owner", "admin"
            ],
            default: "user"
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

    //hashing the password, before saving
    userSchema.pre("save", async function (next) {
        if (!this.isModified("password")) return next();
        this.password = await bcrypt.hash(this.password, 10);
        next();
    });

module.exports = mongoose.model("User", userSchema);