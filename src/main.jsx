import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Fonte Poppins embutida no app (funciona sem internet)
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800.css'
import './styles.css'

createRoot(document.getElementById('root')).render(<App />)
