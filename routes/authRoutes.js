const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/userModel");
const { generateOtp, sendOtpEmail } = require("../utils/otpService");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/multer");

const router = express.Router();

router.post(
    "/register",
    [
      body("firstName").notEmpty(),
      body("lastName").notEmpty(),
      body("email").isEmail(),
      body("password").isLength({ min: 6 }),
      body("role").isIn(["tenant", "landlord"]).withMessage("Role must be either tenant or landlord")
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      try {
        const { firstName, lastName, email, password, role } = req.body;
  
        await User.deleteOne({ email, isVerified: false });
  
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "Email already exists" });
  
        const hashedPassword = await bcrypt.hash(password, 10);
  
        user = new User({
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role
        });
  
        const otp = generateOtp();
        user.verifyOtp = otp;
        user.verifyOtpExpires = Date.now() + 60 * 1000;
        await user.save();
  
        await sendOtpEmail(email, otp, "register");
  
        res.status(201).json({ message: "User registered! Verify your email with OTP." });
      } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Error registering user", error });
      }
    }
  );

router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    if (user.verifyOtp !== otp || user.verifyOtpExpires < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.verifyOtp = null;
    user.verifyOtpExpires = null;
    await user.save();

    res.json({ message: "Email verified successfully!" });
});

router.post("/resend-otp", async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    if (user.isVerified) {
        return res.status(400).json({ message: "Email already verified" });
    }

    if (user.verifyOtpExpires && Date.now() - user.verifyOtpExpires < 60 * 1000) {
        return res.status(400).json({ message: "Please wait for 1 minute before requesting OTP again" });
    }

    const otp = generateOtp();
    user.verifyOtp = otp;
    user.verifyOtpExpires = Date.now() + 60 * 1000;
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP Resent Successfully!" });
});

router.post("/login", [
    body("email").isEmail(),
    body("password").notEmpty()
], async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) return res.status(400).json({ message: "Verify your email first" });

    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES }
    );
    
    res.json({ message: "Login successful", token, role: user.role });
});

router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOtpEmail(email, otp, "reset");

    res.json({ message: "Password reset OTP sent to your email!" });
});

router.post("/reset-password", async (req, res) => {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    if (user.resetOtp !== otp || user.resetOtpExpires < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    res.json({ message: "Password reset successful!" });
});

router.get("/profile", authMiddleware, async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
});

router.post("/upload-profile", authMiddleware, upload.single('profilePicture'), async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.profilePicture = req.file.path;
    await user.save();

    res.json({ message: "Profile picture uploaded successfully", imageUrl: req.file.path });
});

router.put("/switch-role", authMiddleware, async (req, res) => {
  const { role } = req.body;

  if (!["tenant", "landlord"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    await user.save();

    res.json({ message: `Role switched to ${role}` });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put(
  "/update-profile",
  authMiddleware,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { firstName, lastName } = req.body;

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;

      if (req.file && req.file.path) {
        user.profilePicture = req.file.path; // cloudinary URL
      }

      await user.save();
      res.json({ message: "Profile updated successfully!" });
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ message: "Failed to update profile", error: err.message });
    }
  }
);
module.exports = router;
