import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import './DrawingCanvas.css';
import ChatWindow from './ChatWindow';

const DrawingCanvas = () => {
  // =====================================
  // STATE MANAGEMENT & REFS
  // =====================================
  const canvasRef = useRef(null); // Reference to the HTML5 canvas element
  const socketRef = useRef(null); // Reference to the Socket.io connection
  const [isDrawing, setIsDrawing] = useState(false); // Track if user is currently drawing
  const [currentColor, setCurrentColor] = useState('#1e293b'); // Current selected color (professional default)
  const [brushSize, setBrushSize] = useState(3); // Current brush size (smaller default for precision)
  const [connectedUsers, setConnectedUsers] = useState(0); // Number of connected users
  const [showChat, setShowChat] = useState(false);
  // Chat state lifted up
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatUsername, setChatUsername] = useState('');
  const [chatShowPrompt, setChatShowPrompt] = useState(true);
  const [textToolActive, setTextToolActive] = useState(false);
  const [canvasTexts, setCanvasTexts] = useState([]); // [{id, x, y, text, color, fontSize}]
  const [editingText, setEditingText] = useState(null); // {id, x, y, text, color, fontSize} or null

  // =====================================
  // SOCKET.IO CONNECTION & CANVAS SETUP
  // =====================================
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Calculate canvas size to fit within viewport without causing overflow
    const setCanvasSize = () => {
      const container = canvas.parentElement;
      const containerRect = container.getBoundingClientRect();
      
      // Set canvas size with padding to prevent overflow
      canvas.width = Math.max(400, containerRect.width - 40); // Min 400px width for professional use
      canvas.height = Math.max(300, containerRect.height - 40); // Min 300px height
    };
    
    // Set initial canvas size
    setCanvasSize();
    
    // Initialize Socket.io connection to the server
    // Use current hostname to work for both local and network connections
    const serverUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    console.log('🔌 Attempting to connect to Socket.IO server at:', serverUrl);
    socketRef.current = io(serverUrl);
    
    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('✅ Connected to Socket.IO server!');
      console.log('🆔 Socket ID:', socketRef.current.id);
    });
    
    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection failed:', error.message);
      console.log('💡 Make sure the server is running with: node server.js');
    });
    
    socketRef.current.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
    });
    
    // Listen for drawing data from other users (real-time collaboration)
    socketRef.current.on('drawing-data', (data) => {
      console.log('🎨 Received drawing data from another user:', {
        color: data.color,
        brushSize: data.brushSize,
        from: `(${data.x0}, ${data.y0})`,
        to: `(${data.x1}, ${data.y1})`
      });
      drawLine(data);
    });
    
    // Load existing drawing data when a new user joins
    socketRef.current.on('load-drawing', (drawingData) => {
      console.log('📥 Loading existing drawing data:', drawingData.length, 'strokes');
      drawingData.forEach((data, index) => {
        console.log(`  Stroke ${index + 1}:`, data.color, `(${data.x0}, ${data.y0}) -> (${data.x1}, ${data.y1})`);
        drawLine(data);
      });
    });
    
    // Clear canvas when another user clears it
    socketRef.current.on('clear-canvas', () => {
      console.log('🗑️ Canvas cleared by another user');
      context.clearRect(0, 0, canvas.width, canvas.height);
    });
    
    // Handle window resize to maintain canvas proportions
    const handleResize = () => {
      setCanvasSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      socketRef.current.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // =====================================
  // DRAWING FUNCTIONS
  // =====================================
  
  // Function to draw a line on the canvas
  const drawLine = (data) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set drawing properties for professional appearance
    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = data.color;
    context.lineWidth = data.brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round'; // Smooth line joins
    
    // Draw the line from point A to point B
    context.beginPath();
    context.moveTo(data.x0, data.y0);
    context.lineTo(data.x1, data.y1);
    context.stroke();
  };

  // Start drawing when mouse is pressed down
  const startDrawing = (e) => {
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store the starting point for the drawing line
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  // Continue drawing as mouse moves (if mouse is pressed)
  const draw = (e) => {
    if (!isDrawing) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create drawing data object with line coordinates and styling
    const drawingData = {
      x0: canvasRef.current.lastX,
      y0: canvasRef.current.lastY,
      x1: x,
      y1: y,
      color: currentColor,
      brushSize: brushSize
    };
    
    // Draw locally on this user's canvas
    drawLine(drawingData);
    
    // Send drawing data to server for other users to see
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('drawing-data', drawingData);
      console.log('📤 Sent drawing data to server:', {
        color: drawingData.color,
        brushSize: drawingData.brushSize,
        from: `(${drawingData.x0}, ${drawingData.y0})`,
        to: `(${drawingData.x1}, ${drawingData.y1})`
      });
    } else {
      console.log('⚠️ Socket not connected, drawing locally only');
    }
    
    // Update last position for next drawing segment
    canvasRef.current.lastX = x;
    canvasRef.current.lastY = y;
  };

  // Stop drawing when mouse is released
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // =====================================
  // UTILITY FUNCTIONS
  // =====================================
  
  // Clear the entire canvas for all users
  const clearCanvas = () => {
    console.log('🗑️ Clearing canvas locally');
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Notify other users to clear their canvas too
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('clear-canvas');
      console.log('📤 Sent clear canvas request to server');
    } else {
      console.log('⚠️ Socket not connected, clearing locally only');
    }
  };

  // Save canvas as image (professional feature)
  const saveCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `brainstorm-session-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Professional color palette - business appropriate colors (max 12)
  const colors = [
    '#1e293b', // Slate Gray (default)
    '#dc2626', // Red
    '#059669', // Green
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#be123c', // Rose
    '#4338ca', // Indigo
    '#65a30d', // Lime
    '#c2410c', // Orange Red
    '#0f766e'  // Teal
  ];

  // Handle canvas click for placing new text
  const handleCanvasClick = (e) => {
    if (!textToolActive) return;
    // If editing, ignore new clicks
    if (editingText) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setEditingText({
      id: Date.now(),
      x,
      y,
      text: '',
      color: currentColor,
      fontSize: 20
    });
  };

  // Handle clicking an existing text to edit
  const handleTextClick = (t) => {
    if (!textToolActive) return;
    setEditingText({ ...t });
  };

  // Handle input change
  const handleTextInputChange = (e) => {
    setEditingText(editingText ? { ...editingText, text: e.target.value } : null);
  };

  // Handle input keydown (Enter to save, Escape to cancel)
  const handleTextInputKeyDown = (e) => {
    if (!editingText) return;
    if (e.key === 'Enter' && editingText.text.trim() !== '') {
      setCanvasTexts(texts => {
        const exists = texts.some(t => t.id === editingText.id);
        if (exists) {
          // Update existing
          return texts.map(t => t.id === editingText.id ? { ...editingText } : t);
        } else {
          // Add new
          return [...texts, { ...editingText }];
        }
      });
      setEditingText(null);
    } else if (e.key === 'Escape') {
      setEditingText(null);
    }
  };

  // Handle input blur (cancel editing)
  const handleTextInputBlur = () => {
    setEditingText(null);
  };

  // Draw texts on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    // Redraw all texts
    canvasTexts.forEach(t => {
      // If overlays are shown, skip drawing on canvas
      if (textToolActive && !editingText) return;
      ctx.save();
      ctx.font = `${t.fontSize || 20}px sans-serif`;
      ctx.fillStyle = t.color || '#1e293b';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }, [canvasTexts, textToolActive, editingText]);

  // =====================================
  // RENDER COMPONENT UI
  // =====================================
  return (
    <div className="drawing-container" style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* Show/Hide Chat Button */}
      <div style={{ position: 'fixed', top: 16, right: showChat ? 370 : 16, zIndex: 2100 }}>
        <button
          style={{
            background: '#23272f',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            opacity: 0.85
          }}
          onClick={() => setShowChat((v) => !v)}
        >
          {showChat ? 'Hide Chat' : 'Show Chat'}
        </button>
      </div>
      {/* ================================= */}
      {/* TOOLBAR - Professional control panel */}
      {/* ================================= */}
      <div className="toolbar">
        {/* Application header */}
        <div className="toolbar-header">
          <h2>Team Brainstorming Board</h2>
          <div className="toolbar-subtitle">
            Collaborate in real-time with your team members
          </div>
        </div>
        
        {/* BRUSH SIZE CONTROL SECTION */}
        <div className="tool-section brush-section">
          <div className="tool-section-title" style={{ color: '#bbb' }}>Drawing Tools</div>
          <div className="brush-controls">
            <div className="brush-size-display">
              <span className="brush-size-label">Brush Size</span>
              <span className="brush-size-value">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="brush-slider"
            />
          </div>
        </div>
        
        {/* COLOR SELECTOR SECTION */}
        <div className="tool-section color-section">
          <div className="tool-section-title" style={{ color: '#bbb' }}>Color Palette</div>
          <div className="color-palette">
            {colors.map(color => (
              <button
                key={color}
                className={`color-btn ${currentColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
                title={`Select ${color} color`}
              />
            ))}
          </div>
        </div>
        
        {/* TEXT TOOL SECTION */}
        <div className="tool-section text-section">
          <div className="tool-section-title" style={{ color: '#bbb' }}>Text Tool</div>
          <button
            className={textToolActive ? 'active' : ''}
            style={{ margin: '8px 0', padding: '8px 16px', borderRadius: 4, border: '1px solid #444', background: textToolActive ? '#2563eb' : '#23272f', color: '#fff', cursor: 'pointer' }}
            onClick={() => setTextToolActive(a => !a)}
          >
            {textToolActive ? 'Text Tool (Active)' : 'Text Tool'}
          </button>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid #fff', margin: '16px 0' }} />
        {/* ACTIONS SECTION */}
        <div className="tool-section actions-section">
          <div className="tool-section-title" style={{ color: '#bbb' }}>Actions</div>
          <div className="action-buttons">
            <button className="save-btn" onClick={saveCanvas}>
              💾 Save Board
            </button>
            <button className="clear-btn" onClick={clearCanvas}>
              🗑️ Clear Board
            </button>
          </div>
        </div>
        
        {/* STATUS & COLLABORATION INFO SECTION */}
        <div className="status-section">
          <div className="connection-status">
            <div className="status-indicator"></div>
            <span className="status-text">Connected</span>
          </div>
          <div className="collaboration-info">
            Real-time collaboration active. All team members can see changes instantly.
          </div>
          <div className="user-count">
            Active collaborators: {connectedUsers || 1}
          </div>
        </div>
      </div>
      
      {/* ================================= */}
      {/* DRAWING CANVAS - Professional workspace */}
      {/* ================================= */}
      <div className="canvas-container">
        <div className="canvas-wrapper" onClick={handleCanvasClick} style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          {/* Render overlays for all texts if text tool is active and not editing */}
          { textToolActive && !editingText && canvasTexts.map(t => (
            <div
              key={t.id}
              style={{
                position: 'absolute',
                left: t.x,
                top: t.y - 20,
                fontSize: t.fontSize,
                color: t.color,
                background: 'transparent',
                cursor: 'pointer',
                zIndex: 5,
                pointerEvents: 'auto',
                userSelect: 'none'
              }}
              onClick={e => { e.stopPropagation(); handleTextClick(t); }}
            >
              {t.text}
            </div>
          ))}
          {/* Render input for editing text */}
          { editingText && (
            <input
              type="text"
              value={editingText.text}
              autoFocus
              style={{
                position: 'absolute',
                left: editingText.x,
                top: editingText.y - 20,
                fontSize: editingText.fontSize,
                color: editingText.color,
                zIndex: 10,
                background: '#fff',
                border: '1px solid #888',
                borderRadius: 4,
                padding: '2px 6px',
                minWidth: 40
              }}
              onChange={handleTextInputChange}
              onKeyDown={handleTextInputKeyDown}
              onBlur={handleTextInputBlur}
            />
          )}
        </div>
      </div>
      {/* ================================= */}
      {/* CHAT WINDOW OVERLAY - Always in front */}
      {/* ================================= */}
      {showChat && (
        <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 2000, height: '100vh', pointerEvents: 'auto' }}>
          <ChatWindow
            input={chatInput}
            setInput={setChatInput}
            messages={chatMessages}
            setMessages={setChatMessages}
            username={chatUsername}
            setUsername={setChatUsername}
            showPrompt={chatShowPrompt}
            setShowPrompt={setChatShowPrompt}
            socket={socketRef.current}
          />
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas; 