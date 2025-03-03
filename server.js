const express = require('express');
const connectDB = require('./config/db');
const dotenv = require('dotenv');


dotenv.config();
connectDB();


const app = express();
app.use(express.json());

app.get('/', (req,res)=> {
    res.send('Hello World!')
})



app.listen(process.env.PORT,()=>{
    console.log('Server is running')
})