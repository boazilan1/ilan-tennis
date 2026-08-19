import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Register from './pages/Register'
import RegisterThankYou from './pages/RegisterThankYou'
import Admin from './pages/Admin'
import Tournaments from './pages/Tournaments'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Contact from './pages/Contact'
import DynamicPage from './pages/DynamicPage'
import Nokdim from './pages/Nokdim'
import GivatZeev from './pages/GivatZeev'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/thank-you" element={<RegisterThankYou />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/נוקדים" element={<Nokdim />} />
            <Route path="/nokdim" element={<Nokdim />} />
            <Route path="/גבעת-זאב" element={<GivatZeev />} />
            <Route path="/givat-zeev" element={<GivatZeev />} />
            <Route path="/page/:slug" element={<DynamicPage />} />
          </Routes>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
