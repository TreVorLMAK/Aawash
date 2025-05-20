const express = require('express');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const http = require("http");
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');  
const adminRoutes = require('./routes/adminRoutes');
const landlordRoutes = require('./routes/landlordRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const setupSocket = require("./socket");
const chatRoutes = require("./routes/chatRoutes");

dotenv.config();
connectDB();


const app = express();
const server = http.createServer(app);

// Middleware setup
app.use(express.json());
app.use(cors());
setupSocket(server);

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Authentication routes
app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/landlord", landlordRoutes);
app.use("/api/tenant", tenantRoutes);
app.use("/api/messages", chatRoutes);

server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
