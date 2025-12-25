import React, { useState, useEffect } from 'react';
import API from '../services/api';
import HackathonCard from '../components/HackathonCard';

function MyRounds() {
    const [rounds, setRounds] = useState([]);

    useEffect(() => {
        API.get('/hackathons/myrounds')
            .then((res) => setRounds(res.data))
            .catch((err) => console.error(err));
    }, []);

    const removeFromCalendar = (id) => {
        API.patch(`/hackathons/${id}/remove`)
            .then(() => setRounds((prev) => prev.filter((r) => r._id !== id)))
            .catch((err) => console.error(err));
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Rounds</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rounds.map((h) => (
                    <HackathonCard key={h._id} data={h} onRemove={removeFromCalendar} onAdd={() => { }} />
                ))}
            </div>
        </div>
    );
}

export default MyRounds;
