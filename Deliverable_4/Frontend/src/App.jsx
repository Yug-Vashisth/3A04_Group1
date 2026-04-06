import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Login from './Login'
import Dashboard from './citywide_dashboard'
import AlertManagement from "./AlertManagement";
import AlertRules from "./AlertRules";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<AlertManagement />} />
        <Route path="/admin/alert-rules" element={<AlertRules />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
