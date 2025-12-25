import React from 'react';

function HackathonCard({ data, onAdd, onRemove }) {
    const locationType = data.location?.type || 'online';
    const locationText = locationType === 'online'
        ? 'Online'
        : data.location?.venue || data.location?.address?.city || 'TBA';

    const teamSizeText = data.teamSize?.min && data.teamSize?.max
        ? `${data.teamSize.min}-${data.teamSize.max} members`
        : 'Flexible';

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md
                        hover:border-blue-500 hover:shadow-xl 
                        transition-all duration-300 flex flex-col">

            {/* Header: Category & Difficulty */}
            <div className="flex items-center justify-between mb-3">
                {data.category && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                        {data.category}
                    </span>
                )}
                {data.difficulty && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full
                        ${data.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' : ''}
                        ${data.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${data.difficulty === 'Advanced' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                        {data.difficulty}
                    </span>
                )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2">
                {data.title}
            </h3>

            {/* Organizer */}
            <p className="text-sm text-gray-500 mb-2">
                by <span className="text-blue-600 font-medium">{data.organizer || 'Unknown'}</span>
            </p>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                {data.description}
            </p>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="bg-gray-50 px-3 py-2 rounded-lg">
                    <p className="text-gray-500 text-xs">Location</p>
                    <p className="text-gray-800 font-medium truncate">{locationText}</p>
                </div>
                <div className="bg-gray-50 px-3 py-2 rounded-lg">
                    <p className="text-gray-500 text-xs">Team Size</p>
                    <p className="text-gray-800 font-medium">{teamSizeText}</p>
                </div>
                <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                    <p className="text-blue-600 text-xs">Starts</p>
                    <p className="text-gray-800 font-medium">
                        {data.startDate ? new Date(data.startDate).toLocaleDateString() : 'TBA'}
                    </p>
                </div>
                <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
                    <p className="text-blue-600 text-xs">Ends</p>
                    <p className="text-gray-800 font-medium">
                        {data.endDate ? new Date(data.endDate).toLocaleDateString() : 'TBA'}
                    </p>
                </div>
            </div>

            {/* Prize (if available) */}
            {data.prizes && data.prizes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
                    <p className="text-yellow-700 text-xs font-medium">🏆 Prize</p>
                    <p className="text-gray-800 font-semibold">{data.prizes[0].description || `${data.prizes[0].currency} ${data.prizes[0].amount}`}</p>
                </div>
            )}

            {/* Tags */}
            {data.tags && data.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {data.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-auto">
                {data.addedToRounds ? (
                    <button
                        onClick={() => onRemove && onRemove(data._id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold 
                                   py-2 px-4 rounded-xl transition-colors duration-200"
                    >
                        Remove
                    </button>
                ) : (
                    <button
                        onClick={() => onAdd && onAdd(data._id)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold 
                                   py-2 px-4 rounded-xl transition-colors duration-200"
                    >
                        Add to Calendar
                    </button>
                )}
                {data.links?.website && (
                    <a
                        href={data.links.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium 
                                   py-2 px-4 rounded-xl transition-colors duration-200"
                    >
                        View
                    </a>
                )}
            </div>
        </div>
    );
}

export default HackathonCard;