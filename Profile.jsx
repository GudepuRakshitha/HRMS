import React, { useEffect, useState } from 'react';

export default function Profile({ user }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user) {
      const payload = { userId: user.id };
      const response = fetch(`/api/user/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      response.then(res => {
        if (!res.ok) {
          throw new Error('Failed to update profile');
        }
        return res.json();
      })
      .then(data => setProfile(data))
      .catch(err => console.error(err));
    }
  }, [user]);

  if (!user) return <p>Please login first</p>;
  if (!profile) return <p>Loading profile...</p>;

  return (
    <div>
      <h2>User Profile</h2>
      <p><b>ID:</b> {profile.id}</p>
      <p><b>Username:</b> {profile.username}</p>
      <p><b>Role:</b> {profile.role}</p>
    </div>
  );
}