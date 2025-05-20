const nodemailer = require("nodemailer");

const sendOtpEmail = async (email, otp, type) => {
    //testing ko laagi
    console.log(`Generated OTP for ${type} (${email}): ${otp}`);
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    let subject, message;

    if (type === "register") {
        subject = "Verify your email";
        message = `Your registration OTP is: ${otp}`;
    } else if (type === "reset") {
        subject = "Reset your password";
        message = `Your password reset OTP is: ${otp}`;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        text: message,
    };

    await transporter.sendMail(mailOptions);
};

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

module.exports = { sendOtpEmail, generateOtp };
