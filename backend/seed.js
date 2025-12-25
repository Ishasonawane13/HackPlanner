const mongoose = require('mongoose');
const Hackathon = require('./models/Hackathon');
const connectDB = require('./config/db');

const mongoURI = 'mongodb://localhost:27017/hackplanner';

const hackathonData = [
    {
        title: "kAIzen - A GenAI Product Hackathon",
        organizer: "Coding Challenge College Festival",
        description: "GenAI based product hackathon for innovators. Build AI-powered solutions that solve real-world problems.",
        startDate: new Date("2025-11-03"),
        endDate: new Date("2025-11-10"),
        location: "College Campus",
        teamSize: "1-4 members",
        registrationDeadline: new Date("2025-10-27"),
        status: "upcoming",
        addedToRounds: true
    },
    {
        title: "DSA Week: DP and Graphs Grand Finale",
        organizer: "VIT Vellore",
        description: "Finale event focusing on DP and Graphs. Test your algorithmic skills in this competitive coding challenge.",
        startDate: new Date("2025-11-03"),
        endDate: new Date("2025-11-10"),
        location: "Vellore Institute of Technology",
        teamSize: "1-4 members",
        registrationDeadline: new Date("2025-10-27"),
        status: "upcoming",
        addedToRounds: false
    },
    {
        title: "Mineral Forecasting",
        organizer: "Indian Institute of Technology (ISM)",
        description: "Mineral forecasting challenge for engineers. Use ML to predict mineral deposits and optimize mining operations.",
        startDate: new Date("2025-11-25"),
        endDate: new Date("2025-12-02"),
        location: "IIT ISM Dhanbad",
        teamSize: "1-4 members",
        registrationDeadline: new Date("2025-11-18"),
        status: "upcoming",
        addedToRounds: true
    },
   
];

const seedDB = async () => {
    try {
        // Ensure DB connection
        await connectDB();
        await Hackathon.deleteMany({});
        await Hackathon.insertMany(hackathonData);
        console.log('Database seeded successfully');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error seeding database:', error);
        mongoose.connection.close();
    }
};

seedDB();

