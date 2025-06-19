import DrawingCanvas from './DrawingCanvas'
import ChatWindow from './ChatWindow'
import './App.css'

function App() {
  return (
    <div className="main-flex-layout">
      <DrawingCanvas />
      <ChatWindow />
    </div>
  )
}

export default App
