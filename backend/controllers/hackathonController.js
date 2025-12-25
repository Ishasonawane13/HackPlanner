const Hackathon = require('../models/Hackathon');

exports.getAllHackathon = async (req, res) => {
    try {
        const hackathons = await Hackathon.find();
        res.json(hackathons);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createHackathon = async (req, res) => {
    try {
        const hackathon = await Hackathon.create(req.body);
        res.status(201).json(hackathon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addToCalendar = async (req, res) => {
    try {
        const hackathon = await Hackathon.findByIdAndUpdate(
            req.params.id,
            { addedToRounds: true },
            { new: true }
        );
        res.json(hackathon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.removeFromCalendar = async (req, res) => {
    try {
        const hackathon = await Hackathon.findByIdAndUpdate(
            req.params.id,
            { addedToRounds: false },
            { new: true }
        );
        res.json(hackathon);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMyRounds = async (req, res) => {
    try {
        const rounds = await Hackathon.find({ addedToRounds: true });
        res.json(rounds);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};