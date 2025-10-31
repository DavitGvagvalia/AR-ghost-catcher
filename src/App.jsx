import '../style.css'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import { useState } from 'react'
import StartPage from './pages/StartPage'
import GamePage from './pages/GamePage'
import EndPage from './pages/EndPage'

export default function App() {
    const [score,changeScore] = useState(20)
    return (
        <BrowserRouter>
        <Routes>
            <Route path="/" element={<StartPage />} />
            <Route path="/game" element={<GamePage score={score} changeScore={changeScore}/>} />
            <Route path="/end" element={<EndPage score={score} />} />
        </Routes>
        </BrowserRouter>
    )
}

