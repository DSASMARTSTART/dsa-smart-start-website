import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveLearning } from './LiveLearningContext';
import LiveLearningStudio from './LiveLearningStudio';
export default function TeacherWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const { loading, ownTeacherId, error, refresh } = useLiveLearning();
  if (authLoading || loading)
    return (
      <div className="pt-40 px-8 text-white" role="status">
        Loading your calendar…
      </div>
    );
  if (!user)
    return (
      <div className="pt-40 px-8 text-white">
        <h1>Sign in to your teaching workspace</h1>
        <button
          onClick={() => {
            window.location.hash = '#login';
          }}
        >
          Sign in
        </button>
      </div>
    );
  if (error)
    return (
      <div className="pt-40 px-8 text-white" role="alert">
        {error}
        <button onClick={() => void refresh()}>Retry</button>
      </div>
    );
  if (!ownTeacherId)
    return (
      <div className="pt-40 px-8 text-white">
        <h1>Your teaching account is not linked yet.</h1>
        <p>Ask an administrator to add your login email to your teacher profile.</p>
      </div>
    );
  return (
    <div className="pt-32 max-w-7xl mx-auto px-4">
      <LiveLearningStudio mode="teacher" />
    </div>
  );
}
