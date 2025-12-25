import React, { useState, useEffect } from 'react';
import API from '../services/api';
import HackathonCard from '../components/HackathonCard';

function AllSources() {
    const [hackathons, setHackathons] = useState([]);

    useEffect(() => {
        API.get('/hackathons')
            .then((res) => setHackathons(res.data))
            .catch((err) => console.error(err));
    }, []);

    const addToCalendar = (id) => {
        API.patch(`/hackathons/${id}/add`)
            .then(() => {
                setHackathons((prev) => prev.map((h) => (h._id === id ? { ...h, addedToRounds: true } : h)));
            })
            .catch((err) => console.error(err));
    };

    const removeFromCalendar = (id) => {
        API.patch(`/hackathons/${id}/remove`)
            .then(() => {
                setHackathons((prev) => prev.map((h) => (h._id === id ? { ...h, addedToRounds: false } : h)));
            })
            .catch((err) => console.error(err));
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">All Sources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hackathons.map((h) => (
                    <HackathonCard key={h._id} data={h} onAdd={addToCalendar} onRemove={removeFromCalendar} />
                ))}
            </div>
        </div>
    );
}

export default AllSources;