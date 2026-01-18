"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/navbar";
import { 
  updateTeam, 
  removeMember, 
  promoteMember, 
  demoteMember,
  deleteTeam 
} from "./team-manage-actions";

interface TeamManageClientProps {
  user: any;
  profile: any;
  team: any;
  members: any[];
  isCreator: boolean;
}

export default function TeamManageClient({ 
  user, 
  profile, 
  team, 
  members,
  isCreator 
}: TeamManageClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: team.name || '',
    description: team.description || '',
    max_size: team.max_size || '',
    allowed_branches: team.allowed_branches?.join(', ') || '',
    allowed_years: team.allowed_years?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTeam(team.id, {
        name: formData.name,
        description: formData.description,
        max_size: formData.max_size ? parseInt(formData.max_size) : null,
        allowed_branches: formData.allowed_branches 
          ? formData.allowed_branches.split(',').map((s: string) => s.trim()).filter(Boolean)
          : null,
        allowed_years: formData.allowed_years
          ? formData.allowed_years.split(',').map((s: string) => s.trim()).filter(Boolean)
          : null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating team:', error);
    }
    setSaving(false);
  };

  const handleRemoveMember = async (membershipId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      setActionLoading(membershipId);
      try {
        await removeMember(team.id, membershipId);
      } catch (error) {
        console.error('Error removing member:', error);
      }
      setActionLoading(null);
    }
  };

  const handlePromote = async (membershipId: string) => {
    setActionLoading(membershipId);
    try {
      await promoteMember(team.id, membershipId);
    } catch (error) {
      console.error('Error promoting member:', error);
    }
    setActionLoading(null);
  };

  const handleDemote = async (membershipId: string) => {
    setActionLoading(membershipId);
    try {
      await demoteMember(team.id, membershipId);
    } catch (error) {
      console.error('Error demoting member:', error);
    }
    setActionLoading(null);
  };

  const handleDeleteTeam = async () => {
    if (confirm('Are you sure you want to delete this team? This action cannot be undone and all members will be removed.')) {
      try {
        await deleteTeam(team.id);
      } catch (error) {
        console.error('Error deleting team:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'leader':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Leader</span>;
      case 'admin':
        return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">Admin</span>;
      case 'accepted':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Member</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Pending</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} />
      
      <div className="pt-4 md:pt-20 pb-20 md:pb-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <Link href="/profile" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to Profile
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Manage Team</h1>
          </div>

          {/* Team Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
                <p className="text-gray-500">{team.events?.title}</p>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Edit Team
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Size</label>
                    <input
                      type="number"
                      value={formData.max_size}
                      onChange={(e) => setFormData({ ...formData, max_size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      min="2"
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Branches (comma sep.)</label>
                    <input
                      type="text"
                      value={formData.allowed_branches}
                      onChange={(e) => setFormData({ ...formData, allowed_branches: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      placeholder="Any branch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Years (comma sep.)</label>
                    <input
                      type="text"
                      value={formData.allowed_years}
                      onChange={(e) => setFormData({ ...formData, allowed_years: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                      placeholder="Any year"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {team.description && (
                  <p className="text-gray-700 mb-4">{team.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Max Size:</span> {team.max_size || 'Unlimited'}
                  </div>
                  {team.allowed_branches && team.allowed_branches.length > 0 && (
                    <div>
                      <span className="font-medium">Branches:</span> {team.allowed_branches.join(', ')}
                    </div>
                  )}
                  {team.allowed_years && team.allowed_years.length > 0 && (
                    <div>
                      <span className="font-medium">Years:</span> {team.allowed_years.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Team Members ({members.filter(m => m.status !== 'pending' && m.status !== 'rejected').length})
            </h3>
            
            <div className="space-y-4">
              {members
                .filter(m => m.status !== 'pending' && m.status !== 'rejected')
                .map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {member.profiles?.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {member.profiles?.full_name || 'Unknown User'}
                        </p>
                        {getStatusBadge(member.status)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {member.profiles?.year_of_study} • {member.profiles?.branch}
                      </p>
                      {member.profiles?.contact_info && (
                        <p className="text-sm text-gray-500">{member.profiles.contact_info}</p>
                      )}
                      {member.profiles?.skills && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(Array.isArray(member.profiles.skills) 
                            ? member.profiles.skills 
                            : [member.profiles.skills]
                          ).slice(0, 4).map((skill: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions - Only show for non-leaders and if user is creator */}
                    {member.status !== 'leader' && isCreator && (
                      <div className="flex gap-2 flex-shrink-0">
                        {member.status === 'accepted' && (
                          <button
                            onClick={() => handlePromote(member.id)}
                            disabled={actionLoading === member.id}
                            className="px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                          >
                            Make Admin
                          </button>
                        )}
                        {member.status === 'admin' && (
                          <button
                            onClick={() => handleDemote(member.id)}
                            disabled={actionLoading === member.id}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                          >
                            Remove Admin
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(member.id, member.profiles?.full_name || 'this member')}
                          disabled={actionLoading === member.id}
                          className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Danger Zone */}
          {isCreator && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Danger Zone</h3>
              <p className="text-sm text-red-600 mb-4">
                Deleting this team will remove all members and cannot be undone.
              </p>
              <button
                onClick={handleDeleteTeam}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Team
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
