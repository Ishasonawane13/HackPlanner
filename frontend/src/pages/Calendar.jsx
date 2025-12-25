import React, { useState, useEffect } from 'react';
import API from '../services/api';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

function Calendar() {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        API.get('/hackathons/myrounds')
            .then((res) => setEvents(res.data))
            .catch((err) => console.error(err));
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Calendar</h2>
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={events.flatMap((e) => [
                    {
                        id: `${e._id}-start`,
                        title: `${e.title} (start)`,
                        start: e.startDate,
                        allDay: true,
                        color: 'green'
                    },
                    {
                        id: `${e._id}-end`,
                        title: `${e.title} (end)`,
                        start: e.endDate,
                        allDay: true,
                        color: 'red'
                    }
                ])}
                height="auto"
            />
        </div>
    );
}

export default Calendar;