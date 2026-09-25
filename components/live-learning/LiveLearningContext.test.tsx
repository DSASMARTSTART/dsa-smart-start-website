import React, { useEffect } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({user:null as {id:string}|null, workspace:vi.fn()}));
vi.mock('../../contexts/AuthContext', () => ({useAuth:()=>({user:f.user})}));
vi.mock('./api', () => ({liveApi:{workspace:f.workspace}}));
import { LiveLearningProvider, useLiveLearning } from './LiveLearningContext';
afterEach(cleanup);
it('keeps the page mounted on session restoration and ignores the previous account response', async () => {
  let mounts = 0;
  let completeFirst: (value: unknown) => void = () => {};
  f.workspace.mockImplementationOnce(() => new Promise(resolve => {completeFirst=resolve;}))
    .mockResolvedValue({teachers:[],bookings:[],settings:{},selections:{},ownTeacherId:'second'});
  function Page() {
    useEffect(() => { mounts++; }, []);
    const state = useLiveLearning();
    return <div>{state.ownTeacherId || 'empty'}</div>;
  }
  const tree = () => <LiveLearningProvider><Page/></LiveLearningProvider>;
  const { rerender } = render(tree());
  f.user = {id:'first'}; rerender(tree());
  await waitFor(() => expect(f.workspace).toHaveBeenCalledTimes(1));
  f.user = {id:'second'}; rerender(tree());
  expect(await screen.findByText('second')).toBeTruthy();
  completeFirst({teachers:[],bookings:[],settings:{},selections:{},ownTeacherId:'first'});
  await waitFor(() => expect(screen.queryByText('first')).toBeNull());
  expect(mounts).toBe(1);
  f.user = null; rerender(tree());
  expect(screen.getByText('empty')).toBeTruthy();
  expect(mounts).toBe(1);
});
