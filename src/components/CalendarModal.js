import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { fr } from 'date-fns/locale';
import './CalendarModal.css';

const locales = {
  'fr': fr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarModal = ({ isOpen, onClose, events, extractedText }) => {
  const [formattedEvents, setFormattedEvents] = useState([]);

  useEffect(() => {
    const loadEvents = async () => {
      if (events && events.length > 0) {
        const formatted = await formatEvents(events);
        setFormattedEvents(formatted);
      }
    };
    loadEvents();
  }, [events]);
  if (!isOpen) return null;

  const fetchEventDetails = async (eventId) => {
    try {
      const response = await fetch(`https://progpedammi.iut-tlse3.fr/APICelcat/public/events/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch event details');
      return await response.json();
    } catch (error) {
      console.error('Error fetching event details:', error);
      return null;
    }
  };

  const formatEvents = async (rawEvents) => {
    const formattedEvents = [];
    
    for (const room of rawEvents) {
      for (const event of room.events) {
        // Fetch details for each event
        const details = await fetchEventDetails(event.id);
        
        // Convert time strings to Date objects
        const [hours, minutes] = event.startTime.split(':');
        const [endHours, endMinutes] = event.endTime.split(':');
        
        const start = new Date();
        start.setHours(parseInt(hours));
        start.setMinutes(parseInt(minutes));
        
        const end = new Date();
        end.setHours(parseInt(endHours));
        end.setMinutes(parseInt(endMinutes));

        let title = 'Chargement...';
        if (details) {
          const moduleName = details.modules[0]?.record.name || '';
          const groupName = details.groups[0]?.record.name || '';
          const staffName = details.staff[0]?.record.name || '';
          const eventCategory = details.eventCategoryName || '';
          title = { module: moduleName, group: groupName, staff: staffName, category: eventCategory };
        }

        formattedEvents.push({
          title,
          start,
          end,
          resourceId: room.roomid,
        });
      }
    }
    
    return formattedEvents;
  };

  // Styles converted to Tailwind classes

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-indigo-900 to-violet-900 p-5 rounded-2xl shadow-2xl w-[90%] h-[90%] z-[1000] flex flex-col border border-indigo-500/20">
        <div className='flex justify-between items-center mb-4'>
          <h2 className="text-white text-xl font-bold">{extractedText || 'Salle'}</h2>
          <button
            className="px-6 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-all duration-300 shadow-lg hover:shadow-violet-500/25"
            onClick={onClose}>
            Fermer
          </button>
        </div>
        <div className='flex-1 min-h-0'>
          <Calendar
            localizer={localizer}
            events={formattedEvents}
            components={{
              event: ({ event }) => (
                <div className="h-full p-2 overflow-hidden bg-black rounded-lg shadow-xl border-l-4 border-l-violet-500 flex flex-col min-h-[75px]">
                  <div className="flex items-center justify-between shrink-0">
                    <span className="bg-violet-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                      {event.title.category}
                    </span>
                    <span className="text-violet-400 text-xs font-semibold">
                      {new Date(event.start).getHours()}:00 - {new Date(event.end).getHours()}:00
                    </span>
                  </div>
                  <div className="text-white font-bold text-sm leading-tight mt-1 line-clamp-2">{event.title.module}</div>
                  <div className="text-violet-700 font-semibold text-xs truncate">{event.title.group}</div>
                  <div className="text-gray-300 text-xs font-medium mt-auto flex items-center gap-1 shrink-0">
                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate">{event.title.staff}</span>
                  </div>
                </div>
              )
            }}
            className="bg-gray-900 rounded-lg shadow-inner p-4 text-gray-300"
            formats={[]}
            dayPropGetter={date => ({
              className: 'font-semibold text-gray-300'
            })}
            eventPropGetter={() => ({
              className: 'm-1'
            })}
            startAccessor="start"
            endAccessor="end"
            culture="fr"
            defaultView="day"
            views={['day']}
            step={15}
            timeslots={4}
            style={{ height: '100%' }}
            toolbar={false}
            min={new Date(new Date().setHours(8, 0, 0))}
            max={new Date(new Date().setHours(18, 0, 0))}
          />
        </div>
      </div>
    </>
  );
};

export default CalendarModal;
