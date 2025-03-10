const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/userModel");
// const { generateOtp, sendOtpEmail } = require("../utils/otpService");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
    "/register",
    [
        body("firstName").notEmpty().withMessage("First name is required"),
        body("lastName").notEmpty().withMessage("Last name is required"),
        body("email").isEmail().withMessage("Invalid email"),
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const { firstName, lastName, email, password } = req.body;

            let user = await User.findOne({ email });
            if (user) return res.status(400).json({ message: "Email already exists" });

            user = new User({ firstName, lastName, email, password });

            await user.save();

            const otp = generateOtp();
            user.verifyOtp = otp;
            user.verifyOtpExpires = Date.now() + 1 * 60 * 1000;
            await user.save();

            await sendOtpEmail(email, otp);

            res.status(201).json({ message: "User registered! Verify your email with OTP." });
        } catch (error) {
            res.status(500).json({ message: "Error registering user", error });
        }
    }
);

router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Invalid email"),
        body("password").notEmpty().withMessage("Password is required")
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ message: "Invalid credentials" });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

            if (!user.isVerified) return res.status(400).json({ message: "Verify your email first" });

            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES
            });

            res.json({ message: "Login successful", token });
        } catch (error) {
            res.status(500).json({ message: "Error logging in", error });
        }
    }
);

router.get("/profile", authMiddleware, async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ message: "User Profile", user });
});

module.exports = router;
