import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import API from '../services/api';

function Navbar() {
    const [scraping, setScraping] = useState(false);

    const handleScrape = async () => {
        if (scraping) return;
        
        setScraping(true);
        try {
            const response = await API.post('/hackathons/scrape', {}, { timeout: 10000 });
            if (response.data.success) {
                alert(response.data.message || 'Scraper started! Refresh in 1-2 minutes to see new hackathons.');
            } else {
                alert('Warning: ' + response.data.message);
            }
        } catch (error) {
            // Network errors are expected since scraper runs in background
            if (error.code === 'ERR_NETWORK' || error.code === 'ECONNRESET') {
                alert('Scraper started! Please refresh in 1-2 minutes to see new hackathons.');
            } else {
                alert('Error: ' + (error.response?.data?.message || error.message));
            }
        } finally {
            setScraping(false);
        }
    };

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    HackPlanner
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-4">
                    <Link
                        to="/"
                        className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                    >
                        All Sources
                    </Link>
                    <Link
                        to="/my-rounds"
                        className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                    >
                        My Rounds
                    </Link>
                    <Link
                        to="/calendar"
                        className="text-gray-600 hover:text-blue-600 font-medium transition-colors"
                    >
                        Calendar
                    </Link>
                    <button
                        onClick={handleScrape}
                        disabled={scraping}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                            ${scraping 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-green-500 hover:bg-green-600 text-white'}
                        `}
                    >
                        {scraping ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                                Starting...
                            </>
                        ) : (
                            <>
                                Scrape
                            </>
                        )}
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;