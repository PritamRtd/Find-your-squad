"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "../components/navbar";
import { joinTeam, createEvent, deleteEvent, inviteToTeam } from "./explore-actions";

interface ExploreClientProps {
  user: any;
  profile: any;
  events: any[];
  teams: any[];
  people: any[];
  userLeaderTeams: any[];
}

export default function ExploreClient({ user, profile, events, teams, people, userLeaderTeams }: ExploreClientProps) {
  const [activeTab, setActiveTab] = useState<'events' | 'teams' | 'people'>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState<any | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    description: '',
    min_team_size: '',
    max_team_size: '',
    required_skills: [] as string[],
    event_date: '',
    registration_deadline: '',
    // Dynamic composition rules
    year_rules: [] as Array<{year: string, min: string, max: string}>,
    branch_rules: [] as Array<{branch: string, min: string, max: string}>,
    min_different_branches: '',
    max_same_branch: '',
    cross_branch_required: false,
  });
  const [skillInput, setSkillInput] = useState('');

  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEvent = !selectedEvent || team.event_id === selectedEvent;
    return matchesSearch && matchesEvent;
  });

  // Get all unique branches and skills from people
  const allBranches = [...new Set(people.map(p => p.branch).filter(Boolean))];
  const allSkills = [...new Set(people.flatMap(p => Array.isArray(p.skills) ? p.skills : []).filter(Boolean))];

  const filteredPeople = people.filter(person => {
    const matchesSearch = 
      person.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(person.skills) && person.skills.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesBranch = !selectedBranch || person.branch === selectedBranch;
    const matchesSkill = !selectedSkill || (Array.isArray(person.skills) && person.skills.includes(selectedSkill));
    return matchesSearch && matchesBranch && matchesSkill;
  });

  const handleJoinTeam = async (teamId: string) => {
    setJoining(teamId);
    setError(null);
    setSuccess(null);
    try {
      const result = await joinTeam(teamId);
      if (!result.success) {
        setError(result.error || 'Failed to join team');
      } else {
        setSuccess('Request sent successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error joining team:', error);
      setError(error.message || 'Failed to join team');
    }
    setJoining(null);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      // Build team composition rules
      const teamCompositionRules: any = {};
      
      // Year rules
      const validYearRules = newEvent.year_rules.filter(r => r.year && (r.min || r.max));
      if (validYearRules.length > 0) {
        teamCompositionRules.year_rules = validYearRules.map(r => ({
          year: r.year,
          ...(r.min && { min: parseInt(r.min) }),
          ...(r.max && { max: parseInt(r.max) }),
        }));
      }
      
      // Branch rules
      const validBranchRules = newEvent.branch_rules.filter(r => r.branch && (r.min || r.max));
      if (validBranchRules.length > 0) {
        teamCompositionRules.branch_rules = validBranchRules.map(r => ({
          branch: r.branch,
          ...(r.min && { min: parseInt(r.min) }),
          ...(r.max && { max: parseInt(r.max) }),
        }));
      }
      
      // Diversity rules
      if (newEvent.min_different_branches || newEvent.max_same_branch || newEvent.cross_branch_required) {
        teamCompositionRules.diversity = {
          ...(newEvent.min_different_branches && { min_different_branches: parseInt(newEvent.min_different_branches) }),
          ...(newEvent.max_same_branch && { max_same_branch: parseInt(newEvent.max_same_branch) }),
          ...(newEvent.cross_branch_required && { cross_branch_required: true }),
        };
      }

      const result = await createEvent({
        title: newEvent.title,
        description: newEvent.description,
        min_team_size: newEvent.min_team_size ? parseInt(newEvent.min_team_size) : undefined,
        max_team_size: newEvent.max_team_size ? parseInt(newEvent.max_team_size) : undefined,
        required_skills: newEvent.required_skills.length > 0 ? newEvent.required_skills : undefined,
        event_date: newEvent.event_date || undefined,
        registration_deadline: newEvent.registration_deadline || undefined,
        team_composition_rules: Object.keys(teamCompositionRules).length > 0 ? teamCompositionRules : undefined,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create event');
      } else {
        setShowCreateEvent(false);
        setNewEvent({ 
          title: '', 
          description: '',
          min_team_size: '',
          max_team_size: '',
          required_skills: [],
          event_date: '',
          registration_deadline: '',
          year_rules: [],
          branch_rules: [],
          min_different_branches: '',
          max_same_branch: '',
          cross_branch_required: false,
        });
        setSkillInput('');
        setSuccess('Event created successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? All teams under this event will also be deleted.')) {
      return;
    }
    setDeleting(eventId);
    setError(null);
    try {
      const result = await deleteEvent(eventId);
      if (!result.success) {
        setError(result.error || 'Failed to delete event');
      } else {
        setSuccess('Event deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error deleting event:', error);
      setError(error.message || 'Failed to delete event');
    }
    setDeleting(null);
  };

  const addSkillToEvent = () => {
    if (skillInput.trim() && !newEvent.required_skills.includes(skillInput.trim())) {
      setNewEvent(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkillFromEvent = (skill: string) => {
    setNewEvent(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(s => s !== skill)
    }));
  };

  // Year rule helpers
  const addYearRule = () => {
    setNewEvent(prev => ({
      ...prev,
      year_rules: [...prev.year_rules, { year: '', min: '', max: '' }]
    }));
  };

  const updateYearRule = (index: number, field: string, value: string) => {
    setNewEvent(prev => ({
      ...prev,
      year_rules: prev.year_rules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeYearRule = (index: number) => {
    setNewEvent(prev => ({
      ...prev,
      year_rules: prev.year_rules.filter((_, i) => i !== index)
    }));
  };

  // Branch rule helpers
  const addBranchRule = () => {
    setNewEvent(prev => ({
      ...prev,
      branch_rules: [...prev.branch_rules, { branch: '', min: '', max: '' }]
    }));
  };

  const updateBranchRule = (index: number, field: string, value: string) => {
    setNewEvent(prev => ({
      ...prev,
      branch_rules: prev.branch_rules.map((rule, i) => 
        i === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeBranchRule = (index: number) => {
    setNewEvent(prev => ({
      ...prev,
      branch_rules: prev.branch_rules.filter((_, i) => i !== index)
    }));
  };

  const branches = ['CS', 'ECE', 'Mech', 'Civil', 'EE', 'IT'];
  const years = ['1st', '2nd', '3rd', '4th'];

  const handleInviteToTeam = async (userId: string, teamId: string) => {
    setInviting(userId);
    setError(null);
    try {
      const result = await inviteToTeam(userId, teamId);
      if (!result.success) {
        setError(result.error || 'Failed to send invitation');
      } else {
        setShowInviteModal(null);
        setSuccess('Invitation sent successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error inviting user:', error);
      setError(error.message || 'Failed to send invitation');
    }
    setInviting(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} />
      
      <div className="pt-4 md:pt-20 pb-20 md:pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Success Banner */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
              <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
            <p className="text-gray-600 mt-1">Find events, teams, and teammates</p>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'people' ? "Search by name, bio, or skills..." : "Search events or teams..."}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
            
            {activeTab === 'teams' && (
              <select
                value={selectedEvent || ''}
                onChange={(e) => setSelectedEvent(e.target.value || null)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="" className="text-gray-900">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id} className="text-gray-900">{event.title}</option>
                ))}
              </select>
            )}

            {activeTab === 'people' && (
              <>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="" className="text-gray-900">All Branches</option>
                  {allBranches.map(branch => (
                    <option key={branch} value={branch} className="text-gray-900">{branch}</option>
                  ))}
                </select>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="" className="text-gray-900">All Skills</option>
                  {allSkills.map(skill => (
                    <option key={skill} value={skill} className="text-gray-900">{skill}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'events'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'teams'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'people'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              People
            </button>
          </div>

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {filteredEvents.length} Events
                </h2>
                <button
                  onClick={() => setShowCreateEvent(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Event
                </button>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-400 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">No events found</h3>
                  <p className="text-gray-500 mt-1">Create a new event to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEvents.map((event) => {
                    const isCreator = event.created_by === user?.id;
                    return (
                      <div
                        key={event.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all relative"
                      >
                        {isCreator && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteEvent(event.id);
                            }}
                            disabled={deleting === event.id}
                            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete event"
                          >
                            {deleting === event.id ? (
                              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            )}
                          </button>
                        )}
                        
                        <Link href={`/events/${event.id}`}>
                          <h3 className="text-lg font-semibold text-gray-900 pr-8">{event.title}</h3>
                          {event.description && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{event.description}</p>
                          )}
                          
                          {/* Team Requirements */}
                          <div className="mt-3 space-y-2">
                            {(event.min_team_size || event.max_team_size) && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                                </svg>
                                <span>Team size: {event.min_team_size || 1}-{event.max_team_size || '∞'}</span>
                              </div>
                            )}
                            {event.event_date && (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                                <span>{new Date(event.event_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {event.required_skills && event.required_skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {event.required_skills.slice(0, 3).map((skill: string, idx: number) => (
                                  <span key={idx} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded">
                                    {skill}
                                  </span>
                                ))}
                                {event.required_skills.length > 3 && (
                                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                    +{event.required_skills.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Composition Rules Summary */}
                            {event.team_composition_rules && (
                              <div className="mt-2 space-y-1">
                                {event.team_composition_rules.year_rules && event.team_composition_rules.year_rules.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {event.team_composition_rules.year_rules.map((rule: any, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 text-xs bg-green-50 text-green-700 rounded">
                                        {rule.year}: {rule.min && `min ${rule.min}`}{rule.min && rule.max && ', '}{rule.max && `max ${rule.max}`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {event.team_composition_rules.branch_rules && event.team_composition_rules.branch_rules.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {event.team_composition_rules.branch_rules.slice(0, 2).map((rule: any, idx: number) => (
                                      <span key={idx} className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded">
                                        {rule.branch}: {rule.min && `min ${rule.min}`}{rule.min && rule.max && ', '}{rule.max && `max ${rule.max}`}
                                      </span>
                                    ))}
                                    {event.team_composition_rules.branch_rules.length > 2 && (
                                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                        +{event.team_composition_rules.branch_rules.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                )}
                                {event.team_composition_rules.diversity?.cross_branch_required && (
                                  <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                                    Cross-branch required
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
                            View teams
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 ml-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {filteredTeams.length} Teams
              </h2>

              {filteredTeams.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-400 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">No teams found</h3>
                  <p className="text-gray-500 mt-1">Try a different search or filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTeams.map((team) => (
                    <div
                      key={team.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                          {team.memberCount}/{team.max_size || '∞'} members
                        </span>
                      </div>
                      
                      {team.events && (
                        <p className="text-sm text-gray-500 mb-2">
                          Event: {team.events.title}
                        </p>
                      )}
                      
                      {team.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{team.description}</p>
                      )}

                      {team.allowed_branches && team.allowed_branches.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Branches:</p>
                          <div className="flex flex-wrap gap-1">
                            {team.allowed_branches.slice(0, 3).map((branch: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                {branch}
                              </span>
                            ))}
                            {team.allowed_branches.length > 3 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{team.allowed_branches.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {team.required_skills && team.required_skills.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Looking for skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {team.required_skills.slice(0, 3).map((skill: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded">
                                {skill}
                              </span>
                            ))}
                            {team.required_skills.length > 3 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{team.required_skills.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleJoinTeam(team.id)}
                          disabled={joining === team.id}
                          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {joining === team.id ? 'Requesting...' : 'Request to Join'}
                        </button>
                        {/* Message Leader Button */}
                        {team.creator_id && team.creator_id !== user?.id && (
                          <Link
                            href={`/chat?user=${team.creator_id}`}
                            className="px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                            title="Message team leader"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                            </svg>
                          </Link>
                        )}
                        <Link
                          href={`/events/${team.event_id}`}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* People Tab */}
          {activeTab === 'people' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {filteredPeople.length} People
              </h2>

              {filteredPeople.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-400 mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">No people found</h3>
                  <p className="text-gray-500 mt-1">Try a different search or filter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPeople.map((person) => (
                    <div
                      key={person.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {person.avatar_url ? (
                            <img
                              src={person.avatar_url}
                              alt={person.full_name}
                              className="w-14 h-14 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-xl font-semibold text-blue-600">
                                {person.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {person.full_name}
                          </h3>
                          {person.branch && (
                            <p className="text-sm text-gray-500">
                              {person.branch} {person.year_of_study && `• ${person.year_of_study}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {person.bio && (
                        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{person.bio}</p>
                      )}

                      {/* Skills */}
                      {Array.isArray(person.skills) && person.skills.length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {person.skills.slice(0, 4).map((skill: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">
                                {skill}
                              </span>
                            ))}
                            {person.skills.length > 4 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                +{person.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setShowProfileModal(person)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          View Profile
                        </button>
                        {userLeaderTeams.length > 0 && (
                          <button
                            onClick={() => setShowInviteModal(person)}
                            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Invite to Team
                          </button>
                        )}
                        <Link
                          href={`/chat?user=${person.id}`}
                          className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Create Event</h2>
              <button
                onClick={() => setShowCreateEvent(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="space-y-5">
                {/* Basic Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder="e.g., Hackathon 2026"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder="Describe the event..."
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                    <input
                      type="datetime-local"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Deadline</label>
                    <input
                      type="datetime-local"
                      value={newEvent.registration_deadline}
                      onChange={(e) => setNewEvent({ ...newEvent, registration_deadline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>

                {/* Team Size Requirements */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Team Size</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Team Size</label>
                      <input
                        type="number"
                        min="1"
                        value={newEvent.min_team_size}
                        onChange={(e) => setNewEvent({ ...newEvent, min_team_size: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Team Size</label>
                      <input
                        type="number"
                        min="1"
                        value={newEvent.max_team_size}
                        onChange={(e) => setNewEvent({ ...newEvent, max_team_size: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

                {/* Year Composition Rules */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Year Requirements (optional)</h3>
                    <button
                      type="button"
                      onClick={addYearRule}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Rule
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Define how many members from each year are required</p>
                  
                  {newEvent.year_rules.map((rule, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                      <select
                        value={rule.year}
                        onChange={(e) => updateYearRule(index, 'year', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
                      >
                        <option value="">Select Year</option>
                        {years.map(y => <option key={y} value={y}>{y} Year</option>)}
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={rule.min}
                        onChange={(e) => updateYearRule(index, 'min', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={rule.max}
                        onChange={(e) => updateYearRule(index, 'max', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeYearRule(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {newEvent.year_rules.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No year rules - all years allowed</p>
                  )}
                </div>

                {/* Branch Composition Rules */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Branch Requirements (optional)</h3>
                    <button
                      type="button"
                      onClick={addBranchRule}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Rule
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Define how many members from each branch are required</p>
                  
                  {newEvent.branch_rules.map((rule, index) => (
                    <div key={index} className="flex gap-2 mb-2 items-center">
                      <select
                        value={rule.branch}
                        onChange={(e) => updateBranchRule(index, 'branch', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
                      >
                        <option value="">Select Branch</option>
                        {branches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="Min"
                        value={rule.min}
                        onChange={(e) => updateBranchRule(index, 'min', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Max"
                        value={rule.max}
                        onChange={(e) => updateBranchRule(index, 'max', e.target.value)}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeBranchRule(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {newEvent.branch_rules.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No branch rules - all branches allowed</p>
                  )}
                </div>

                {/* Diversity Rules */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Diversity Rules (optional)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Different Branches</label>
                      <input
                        type="number"
                        min="0"
                        value={newEvent.min_different_branches}
                        onChange={(e) => setNewEvent({ ...newEvent, min_different_branches: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="e.g., 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Same Branch</label>
                      <input
                        type="number"
                        min="0"
                        value={newEvent.max_same_branch}
                        onChange={(e) => setNewEvent({ ...newEvent, max_same_branch: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder="e.g., 3"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newEvent.cross_branch_required}
                      onChange={(e) => setNewEvent({ ...newEvent, cross_branch_required: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Cross-branch team required (must have members from different branches)</span>
                  </label>
                </div>

                {/* Required Skills */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Skills (optional)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkillToEvent();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      placeholder="e.g., React, Python"
                    />
                    <button
                      type="button"
                      onClick={addSkillToEvent}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {newEvent.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newEvent.required_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-purple-50 text-purple-700 rounded-full"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkillFromEvent(skill)}
                            className="hover:text-purple-900"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateEvent(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header with close button */}
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">Profile</h2>
                <button
                  onClick={() => setShowProfileModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Profile content */}
              <div className="flex items-center gap-4 mb-6">
                {showProfileModal.avatar_url ? (
                  <img
                    src={showProfileModal.avatar_url}
                    alt={showProfileModal.full_name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-blue-600">
                      {showProfileModal.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{showProfileModal.full_name}</h3>
                  {(showProfileModal.branch || showProfileModal.year_of_study) && (
                    <p className="text-gray-600">
                      {showProfileModal.branch} {showProfileModal.year_of_study && `• ${showProfileModal.year_of_study}`}
                    </p>
                  )}
                </div>
              </div>

              {showProfileModal.bio && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Bio</h4>
                  <p className="text-gray-600">{showProfileModal.bio}</p>
                </div>
              )}

              {Array.isArray(showProfileModal.skills) && showProfileModal.skills.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {showProfileModal.skills.map((skill: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              <div className="flex gap-3 mt-6">
                {showProfileModal.github_url && (
                  <a
                    href={showProfileModal.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                  </a>
                )}
                {showProfileModal.linkedin_url && (
                  <a
                    href={showProfileModal.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    LinkedIn
                  </a>
                )}
                {showProfileModal.portfolio_url && (
                  <a
                    href={showProfileModal.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    Portfolio
                  </a>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <Link
                  href={`/chat?user=${showProfileModal.id}`}
                  className="flex-1 px-4 py-2 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Message
                </Link>
                {userLeaderTeams.length > 0 && (
                  <button
                    onClick={() => {
                      setShowProfileModal(null);
                      setShowInviteModal(showProfileModal);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Invite to Team
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite to Team Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Invite to Team</h2>
              <button
                onClick={() => setShowInviteModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              Invite <span className="font-semibold">{showInviteModal.full_name}</span> to one of your teams:
            </p>

            <div className="space-y-2">
              {userLeaderTeams.map((team) => {
                const isFull = team.max_size && team.memberCount >= team.max_size;
                return (
                  <button
                    key={team.id}
                    onClick={() => handleInviteToTeam(showInviteModal.id, team.id)}
                    disabled={isFull || inviting === showInviteModal.id}
                    className={`w-full flex justify-between items-center p-4 border rounded-lg transition-colors ${
                      isFull 
                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{team.name}</p>
                      <p className="text-sm text-gray-500">
                        {team.memberCount}/{team.max_size || '∞'} members
                      </p>
                    </div>
                    {isFull ? (
                      <span className="text-sm text-gray-500">Full</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {userLeaderTeams.length === 0 && (
              <div className="text-center py-6">
                <p className="text-gray-500">You don&apos;t have any teams to invite people to.</p>
                <Link
                  href="/explore"
                  onClick={() => setShowInviteModal(null)}
                  className="text-blue-600 hover:underline mt-2 inline-block"
                >
                  Create a team first
                </Link>
              </div>
            )}

            <button
              onClick={() => setShowInviteModal(null)}
              className="w-full mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
