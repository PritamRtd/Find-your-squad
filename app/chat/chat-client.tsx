"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../components/navbar";
import { sendMessage, acceptRequest, rejectRequest } from "./chat-actions";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  team_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  name: string;
  description: string;
  eventTitle?: string;
  isOwner: boolean;
  status: string;
  pendingRequests: any[];
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatClientProps {
  user: any;
  profile: any;
  memberships: any[];
  teamsWithRequests: any[];
  lastMessages: Record<string, any>;
  unreadByTeam: Record<string, number>;
  selectedTeamId?: string;
}

// Polling interval in milliseconds (3 seconds)
const POLL_INTERVAL = 3000;

export default function ChatClient({ 
  user, 
  profile, 
  memberships, 
  teamsWithRequests,
  lastMessages: initialLastMessages,
  unreadByTeam: initialUnreadByTeam,
  selectedTeamId
}: ChatClientProps) {
  const [activeChat, setActiveChat] = useState<string | null>(selectedTeamId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobileList, setShowMobileList] = useState(!selectedTeamId);
  const [lastMessages, setLastMessages] = useState(initialLastMessages);
  const [unreadByTeam, setUnreadByTeam] = useState(initialUnreadByTeam);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastFetchedIdRef = useRef<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Build conversations list
  const allConversations: Conversation[] = [
    ...memberships.map(m => ({
      id: m.team_id,
      name: m.teams?.name || 'Unknown Team',
      description: m.teams?.description || '',
      eventTitle: m.teams?.events?.title,
      isOwner: m.teams?.creator_id === user.id,
      status: m.status,
      pendingRequests: [] as any[],
      lastMessage: lastMessages[m.team_id],
      unreadCount: unreadByTeam[m.team_id] || 0,
    })),
    ...teamsWithRequests
      .filter(t => !memberships.some(m => m.team_id === t.id))
      .map(t => ({
        id: t.id,
        name: t.name || 'Unknown Team',
        description: t.description || '',
        eventTitle: t.events?.title,
        isOwner: true,
        status: 'leader',
        pendingRequests: t.pendingRequests || [],
        lastMessage: lastMessages[t.id],
        unreadCount: unreadByTeam[t.id] || 0,
      })),
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  // Add pending requests to owned teams
  allConversations.forEach(conv => {
    const teamWithRequests = teamsWithRequests.find(t => t.id === conv.id);
    if (teamWithRequests) {
      conv.pendingRequests = teamWithRequests.pendingRequests || [];
    }
  });

  const activeConversation = allConversations.find(c => c.id === activeChat);

  // Fetch messages function
  const fetchMessages = useCallback(async (teamId: string, isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          id,
          team_id,
          sender_id,
          content,
          message_type,
          created_at,
          profiles(full_name, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Transform the data to match our Message interface
      const transformedMessages: Message[] = (data || []).map((msg: any) => ({
        ...msg,
        profiles: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
      }));
      
      setMessages(transformedMessages);
      
      // Update last fetched ID for polling
      if (transformedMessages.length > 0) {
        lastFetchedIdRef.current = transformedMessages[transformedMessages.length - 1].id;
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Poll for new messages
  const pollForMessages = useCallback(async (teamId: string) => {
    try {
      const supabase = createClient();
      
      // Fetch all messages and compare
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(`
          id,
          team_id,
          sender_id,
          content,
          message_type,
          created_at,
          profiles(full_name, avatar_url)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        const transformedMessages: Message[] = data.map((msg: any) => ({
          ...msg,
          profiles: Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
        }));

        // Only update if there are new messages
        setMessages(prev => {
          if (transformedMessages.length !== prev.length) {
            return transformedMessages;
          }
          // Check if last message is different
          if (prev.length > 0 && transformedMessages.length > 0) {
            const lastPrev = prev[prev.length - 1];
            const lastNew = transformedMessages[transformedMessages.length - 1];
            if (lastPrev.id !== lastNew.id) {
              return transformedMessages;
            }
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, []);

  // Start/stop polling when active chat changes
  useEffect(() => {
    if (!activeChat) return;

    // Initial fetch
    fetchMessages(activeChat, true);

    // Start polling
    pollingRef.current = setInterval(() => {
      pollForMessages(activeChat);
    }, POLL_INTERVAL);

    // Cleanup
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeChat, fetchMessages, pollForMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    setError(null);

    // Optimistic update - add message immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      team_id: activeChat,
      sender_id: user.id,
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      profiles: {
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
      },
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      await sendMessage(activeChat, messageContent);
      // Fetch latest messages to get the real message with ID
      await fetchMessages(activeChat, false);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessage(messageContent); // Restore the message
    } finally {
      setSending(false);
    }
  };

  // Accept request handler
  const handleAcceptRequest = async (membershipId: string, teamId: string) => {
    try {
      await acceptRequest(membershipId, teamId);
      // Refresh messages to show system message
      await fetchMessages(teamId, false);
      // Update the conversation to remove pending request
      window.location.reload(); // Simple refresh to update UI
    } catch (err: any) {
      console.error('Error accepting request:', err);
      setError('Failed to accept request. Please try again.');
    }
  };

  // Reject request handler
  const handleRejectRequest = async (membershipId: string, teamId: string) => {
    try {
      await rejectRequest(membershipId, teamId);
      window.location.reload(); // Simple refresh to update UI
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject request. Please try again.');
    }
  };

  // Format time helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Calculate total unread
  const totalUnread = Object.values(unreadByTeam).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} profile={profile} unreadMessages={totalUnread} />
      
      <div className="pt-0 md:pt-16 pb-16 md:pb-0 h-screen flex">
        <div className="flex w-full max-w-7xl mx-auto">
          {/* Conversation List */}
          <div className={`${showMobileList ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 flex-col border-r border-gray-200 bg-white`}>
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <p className="text-xs text-gray-500 mt-1">Auto-updates every 3 seconds</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {allConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                  <p className="font-medium">No conversations yet</p>
                  <p className="text-sm mt-1">Join a team to start chatting</p>
                </div>
              ) : (
                allConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveChat(conv.id);
                      setShowMobileList(false);
                      lastFetchedIdRef.current = null;
                    }}
                    className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      activeChat === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">
                        {conv.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conv.name}
                        </h3>
                        {conv.lastMessage && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatTime(conv.lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conv.eventTitle || 'No event'}
                      </p>
                      {conv.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conv.lastMessage.content}
                        </p>
                      )}
                      {conv.pendingRequests.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          {conv.pendingRequests.length} request{conv.pendingRequests.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-white bg-blue-600 rounded-full flex-shrink-0">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${!showMobileList ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white`}>
            {activeChat && activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center gap-3 bg-white">
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-bold">
                      {activeConversation.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{activeConversation.name}</h2>
                    <p className="text-sm text-gray-500 truncate">{activeConversation.eventTitle || 'Team chat'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeConversation.isOwner && (
                      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Leader
                      </span>
                    )}
                    <button
                      onClick={() => fetchMessages(activeChat, false)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                      title="Refresh messages"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {/* Pending Requests Banner */}
                {activeConversation.pendingRequests.length > 0 && activeConversation.isOwner && (
                  <div className="p-4 bg-yellow-50 border-b border-yellow-100">
                    <h3 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                      </svg>
                      Join Requests ({activeConversation.pendingRequests.length})
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {activeConversation.pendingRequests.map((request: any) => (
                        <div key={request.id} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {request.profiles?.avatar_url ? (
                              <img src={request.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {request.profiles?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {request.profiles?.year_of_study} • {request.profiles?.branch}
                            </p>
                            {request.profiles?.skills && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(Array.isArray(request.profiles.skills) 
                                  ? request.profiles.skills 
                                  : [request.profiles.skills]
                                ).slice(0, 3).map((skill: string, idx: number) => (
                                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700 rounded">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleAcceptRequest(request.id, activeChat)}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id, activeChat)}
                              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                      <p>Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 text-gray-300">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                      <p className="font-medium text-gray-900">No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => {
                        const isOwn = message.sender_id === user.id;
                        const isSystem = message.message_type === 'join_request' || message.message_type === 'system';
                        const isTemp = message.id.startsWith('temp-');

                        // Show date separator
                        const showDate = index === 0 || 
                          new Date(message.created_at).toDateString() !== 
                          new Date(messages[index - 1].created_at).toDateString();

                        if (isSystem) {
                          return (
                            <div key={message.id}>
                              {showDate && (
                                <div className="flex justify-center my-4">
                                  <span className="px-3 py-1 text-xs text-gray-500 bg-white rounded-full shadow-sm">
                                    {new Date(message.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-center">
                                <span className="px-3 py-1.5 text-sm text-gray-600 bg-white rounded-full shadow-sm border border-gray-100">
                                  {message.content}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={message.id}>
                            {showDate && (
                              <div className="flex justify-center my-4">
                                <span className="px-3 py-1 text-xs text-gray-500 bg-white rounded-full shadow-sm">
                                  {new Date(message.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            )}
                            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                                {!isOwn && (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {message.profiles?.avatar_url ? (
                                      <img src={message.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-sm font-medium text-gray-600">
                                        {message.profiles?.full_name?.charAt(0) || '?'}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className={`${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                                  {!isOwn && (
                                    <p className="text-xs text-gray-500 mb-1 ml-1">
                                      {message.profiles?.full_name || 'Unknown'}
                                    </p>
                                  )}
                                  <div className={`px-4 py-2.5 rounded-2xl ${
                                    isOwn 
                                      ? `bg-blue-600 text-white rounded-br-md ${isTemp ? 'opacity-70' : ''}` 
                                      : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                                  }`}>
                                    <p className="whitespace-pre-wrap break-words text-[15px]">{message.content}</p>
                                  </div>
                                  <p className={`text-[10px] text-gray-400 mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                                    {isTemp ? 'Sending...' : formatTime(message.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                {activeConversation.status !== 'pending' ? (
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={sending}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-50 text-gray-900 bg-white"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-4 border-t border-gray-200 bg-yellow-50 text-center">
                    <p className="text-yellow-800 font-medium">
                      ⏳ Your request to join is pending
                    </p>
                    <p className="text-yellow-600 text-sm mt-1">
                      Wait for the team leader to accept your request
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-20 h-20 mb-4 text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h2>
                <p className="text-center max-w-sm">
                  Choose a team from the sidebar to view messages and collaborate with your teammates
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
