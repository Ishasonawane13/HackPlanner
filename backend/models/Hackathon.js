
const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    organizer: String,
    category: String,
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Intermediate'
    },

    startDate: Date,
    endDate: Date,
    registrationDeadline: Date,

    location: {
        type: {
            type: String,
            enum: ['online', 'offline', 'hybrid'],
            default: 'online'
        },
        venue: String,
        address: {
            city: String,
            state: String,
            country: String
        }
    },

    teamSize: {
        min: { type: Number, default: 1 },
        max: { type: Number, default: 4 }
    },

    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed'],
        default: 'upcoming'
    },

    links: {
        website: String,
        registration: String,
        discord: String
    },

    prizes: [{
        position: String,
        amount: Number,
        currency: { type: String, default: 'INR' },
        description: String
    }],

    tags: [String],
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    source: String,
    scraped_at: Date,

    addedToRounds: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Hackathon', hackathonSchema);