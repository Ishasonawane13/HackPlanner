
import './App.css';

import { BrowserRouter , Routes , Route} from 'react-router-dom';
import AllSources from './pages/AllSources';
import MyRounds from './pages/MyRounds';
import Calendar from './pages/Calendar';
import Navbar from './components/Navbar';



function App() {
  return (
    <BrowserRouter>
      <Navbar/>
        <Routes>
          <Route path='/' element={<AllSources/>}/>
          <Route path='/my-rounds' element={<MyRounds/>}/>
          <Route path='/calendar' element={<Calendar/>}/>
        </Routes>
    </BrowserRouter>
  );
}

export default App;
