import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import './styles/app.css'
import { Index } from './pages/Index'
import { Layout } from './components/Layout'


const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
