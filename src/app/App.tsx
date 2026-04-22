import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from '@/pages/index';
import RoomPage from '@/pages/rooms/[roomId]';
import MapCreatorPage from '@/pages/mapcreator';
import MapPage from '@/pages/maps/[mapId]';
import ReplayPage from '@/pages/replays/[replayId]';
import TutorialPage from '@/pages/tutorial';

export default function App() {
  return (
    <Routes>
      <Route path='/' element={<HomePage />} />
      <Route path='/tutorial' element={<TutorialPage />} />
      <Route path='/rooms/:roomId' element={<RoomPage />} />
      <Route path='/mapcreator' element={<MapCreatorPage />} />
      <Route path='/maps/:mapId' element={<MapPage />} />
      <Route path='/replays/:replayId' element={<ReplayPage />} />
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
