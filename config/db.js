const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async()=>{
    try {
  const conn = await mongoose.connect(process.env.DB_URL);

console.log("Database Connected Successfully");

} catch (error) {
    console.log("Error connecting to database", error);
}
};

module.exports = connectDB;