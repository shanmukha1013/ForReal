import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks';
import { AnimatedButton, CredibilityBadge, StatusBadge, Avatar } from '@/components/ui';
import { Loader } from '@/components';
import apiClient from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import { toast } from 'react-hot-toast';

export const Profile = () => {
  const { username } = useParams();
  usePageTitle(`${username} | ForReal`);
  const { user: currentUser } = useAuthStore();

  const [profileData, setProfileData] = useState(null);
  const [debates, setDebates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('DEBATES');

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/users/${username}`);
        setProfileData(res.data);
        
        // Check if current user is following this profile
        if (currentUser && res.data.followers.includes(currentUser._id)) {
          setIsFollowing(true);
        }

        const debatesRes = await apiClient.get(`/debates?username=${username}`);
        setDebates(debatesRes.data.debates || []);
      } catch (err) {
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [username, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) return toast.error('You must be logged in');
    try {
      if (isFollowing) {
        await apiClient.post(`/users/${profileData._id}/unfollow`);
        setIsFollowing(false);
        setProfileData(prev => ({
          ...prev,
          followers: prev.followers.filter(id => id !== currentUser._id)
        }));
      } else {
        await apiClient.post(`/users/${profileData._id}/follow`);
        setIsFollowing(true);
        setProfileData(prev => ({
          ...prev,
          followers: [...prev.followers, currentUser._id]
        }));
      }
    } catch (err) {
      toast.error('Action failed');
    }
  };

  if (isLoading) return <Loader fullScreen />;
  if (!profileData) return <div className="text-center p-12 text-white">Profile not found.</div>;

  const isOwnProfile = currentUser?._id === profileData._id;

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Cover */}
      <div className="h-48 w-full bg-gradient-to-r from-bg-dark via-primary/10 to-bg-dark rounded-xl mb-16 relative border border-border-subtle/50">
        {/* Avatar */}
        <div className="absolute -bottom-12 left-6">
          <div className="relative group border-4 border-bg-dark rounded-full shrink-0">
             <Avatar src={profileData.profile?.avatar} username={profileData.username} size="xl" />
          </div>
        </div>
        
        {/* Actions */}
        <div className="absolute -bottom-14 right-6 flex gap-2">
          {!isOwnProfile ? (
            <AnimatedButton variant={isFollowing ? "outline" : "primary"} onClick={handleFollow}>
              {isFollowing ? 'Unfollow' : 'Follow'}
            </AnimatedButton>
          ) : (
            <Link to="/settings">
              <AnimatedButton variant="outline">Edit Profile</AnimatedButton>
            </Link>
          )}
        </div>
      </div>

      <div className="px-2 mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight mb-1">{profileData.username}</h1>
        <p className="text-text-muted text-sm mb-4">@user_{profileData.username?.toLowerCase()}</p>
        
        <div className="flex gap-4 mb-6">
          <CredibilityBadge score={profileData.credibilityScore || 50} size="lg" />
          <div className="flex flex-col text-sm border-l border-border-subtle pl-4">
            <span className="text-white font-bold">{debates.length}</span>
            <span className="text-text-muted">Debates</span>
          </div>
          <div className="flex flex-col text-sm border-l border-border-subtle pl-4">
            <span className="text-white font-bold">{profileData.followers?.length || 0}</span>
            <span className="text-text-muted">Followers</span>
          </div>
          <div className="flex flex-col text-sm border-l border-border-subtle pl-4">
            <span className="text-white font-bold">{profileData.following?.length || 0}</span>
            <span className="text-text-muted">Following</span>
          </div>
        </div>
        
        <p className="text-sm text-white/90 leading-relaxed max-w-xl">
          {profileData.profile?.bio || 'Truth Seeker and Developer. Exploring the boundaries of logic.'}
        </p>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-6 border-b border-border-subtle mb-6 px-2">
        <div 
          className={`pb-3 border-b-2 font-bold text-sm tracking-wide cursor-pointer transition-colors ${activeTab === 'DEBATES' ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
          onClick={() => setActiveTab('DEBATES')}
        >
          DEBATES
        </div>
        <div 
          className={`pb-3 border-b-2 font-bold text-sm tracking-wide cursor-pointer transition-colors ${activeTab === 'ARGUMENTS' ? 'border-primary text-white' : 'border-transparent text-text-muted hover:text-white'}`}
          onClick={() => setActiveTab('ARGUMENTS')}
        >
          ARGUMENTS
        </div>
      </div>
      
      <div className="px-2">
        {activeTab === 'DEBATES' && (
          <div className="space-y-4">
            {debates.length > 0 ? (
              debates.map(debate => (
                <Link key={debate._id} to={`/debates/${debate._id}`} className="block bg-card-dark border border-border-subtle rounded-xl p-4 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-bold text-lg">{debate.title}</h3>
                    <StatusBadge status={debate.status} />
                  </div>
                  <p className="text-text-muted text-sm line-clamp-2">{debate.description}</p>
                </Link>
              ))
            ) : (
              <div className="text-center py-24 border border-dashed border-border-subtle rounded-2xl bg-card-dark flex flex-col items-center justify-center">
                 <h3 className="text-lg font-bold text-white mb-2 tracking-tight">A quiet mind.</h3>
                 <p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">
                   {isOwnProfile ? "You haven't started any debates yet. The floor is yours." : `${profileData.username} hasn't started any debates yet.`}
                 </p>
                 {isOwnProfile && (
                   <div className="mt-6">
                     <Link to="/debates">
                       <AnimatedButton variant="primary">Start a Debate</AnimatedButton>
                     </Link>
                   </div>
                 )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ARGUMENTS' && (
          <div className="text-center py-24 border border-dashed border-border-subtle rounded-2xl bg-card-dark flex flex-col items-center justify-center">
             <h3 className="text-lg font-bold text-white mb-2 tracking-tight">No arguments found.</h3>
             <p className="text-text-muted text-sm max-w-xs mx-auto leading-relaxed">
               {isOwnProfile ? "You haven't contributed to any debates yet. Find a topic and speak your mind." : `${profileData.username} hasn't contributed to any debates yet.`}
             </p>
          </div>
        )}
      </div>
    </div>
  );
};
