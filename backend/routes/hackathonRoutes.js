
const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const router = express.Router();

const {
    getAllHackathon,
    createHackathon,
    addToCalendar,
    removeFromCalendar,
    getMyRounds
} = require('../controllers/hackathonController');

router.get('/', getAllHackathon);
router.post('/', createHackathon);
router.patch('/:id/add', addToCalendar);
router.patch('/:id/remove', removeFromCalendar);
router.get('/myrounds', getMyRounds);

// Track scraper status
let scraperStatus = { running: false, lastRun: null, lastResult: null };

// Get scraper status
router.get('/scrape/status', (req, res) => {
    res.json(scraperStatus);
});

// Scraper endpoint - runs in background
router.post('/scrape', async (req, res) => {
    try {
        // Prevent multiple simultaneous runs
        if (scraperStatus.running) {
            return res.json({
                success: false,
                message: 'Scraper is already running. Please wait...'
            });
        }

        const scraperPath = path.join(__dirname, '..', 'scraper', 'unstop_scraper.py');
        
        scraperStatus.running = true;
        scraperStatus.lastRun = new Date();

        // Respond immediately - scraper runs in background
        res.json({
            success: true,
            message: 'Scraper started! This may take 1-2 minutes. Refresh the page to see new hackathons.'
        });

        const python = spawn('python', [scraperPath], {
            cwd: path.join(__dirname, '..', 'scraper'),
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        let output = '';
        let errorOutput = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
            console.log(`Scraper: ${data}`);
        });

        python.stderr.on('data', (data) => {
            errorOutput += data.toString();
            console.error(`Scraper Error: ${data}`);
        });

        python.on('close', (code) => {
            scraperStatus.running = false;
            scraperStatus.lastResult = {
                success: code === 0,
                code: code,
                message: code === 0 ? 'Completed successfully' : 'Failed',
                timestamp: new Date()
            };
            console.log(`Scraper finished with code ${code}`);
        });

        python.on('error', (err) => {
            scraperStatus.running = false;
            scraperStatus.lastResult = {
                success: false,
                message: err.message,
                timestamp: new Date()
            };
            console.error(`Scraper error: ${err.message}`);
        });

    } catch (error) {
        scraperStatus.running = false;
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;