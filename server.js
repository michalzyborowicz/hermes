const express = require('express')
const WebSocket = require('ws')
const jwt = require('jsonwebtoken')
const bodyParser = require('body-parser')
const path = require('path')
const bcrypt = require('bcryptjs') // For hashing passwords
const cors = require('cors') // Import CORS for handling cross-origin

// Secret key for JWT
const JWT_SECRET = 'your_secret_key'

// Dummy user data (to be replaced with a database in the future)
// Passwords are now hashed using bcrypt
const USERS = [
	{ username: 'plottebord', password: bcrypt.hashSync('Postnord2025', 10) },
	{ username: 'ips', password: bcrypt.hashSync('Langhus2025!', 10) },
]

// Initialize Express application
const app = express()

// Enable CORS to allow requests from external domains
app.use(cors()) // Allow all domains to access the backend

// Middleware to parse JSON bodies
app.use(bodyParser.json())

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')))

// Middleware to check authentication (JWT verification)
function authenticate(req, res, next) {
	const token = req.headers['authorization']?.replace('Bearer ', '') // Get token from headers
	if (!token) {
		return res.status(401).json({ error: 'Unauthorized' }) // No token provided
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET) // Verify token
		req.user = decoded // Attach user info to request object
		next() // Proceed to the next middleware or route handler
	} catch (err) {
		return res.status(403).json({ error: 'Invalid token' }) // Invalid token
	}
}

// Login endpoint (authentication)
app.post('/login', (req, res) => {
	const { username, password } = req.body
	const user = USERS.find(u => u.username === username) // Find user by username

	// Check if user exists and password matches
	if (!user || !bcrypt.compareSync(password, user.password)) {
		return res.status(401).json({ error: 'Invalid username or password' }) // Invalid credentials
	}

	// Generate JWT token
	const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' })
	res.json({ token }) // Send the token as response
})

// WebSocket server setup
const PORT = process.env.PORT || 3000
const server = app.listen(PORT, '0.0.0.0', () => {
	console.log(`Express server is running on http://0.0.0.0:${PORT}`)
})

// WebSocket server
const wss = new WebSocket.Server({ server })

// Tasks memory
let tasks = []

// WebSocket connections
wss.on('connection', ws => {
	console.log('Client connected.')

	// Send initial task data to the connected client
	ws.send(JSON.stringify({ type: 'initialSync', tasks }))

	// Handle messages from the WebSocket client
	ws.on('message', message => {
		const data = JSON.parse(message)
		console.log('Received message:', data)

		if (data.type === 'updateTasks') {
			const { action, task } = data

			// Update or add task
			const existingTaskIndex = tasks.findIndex(t => t.id === task.id)
			if (existingTaskIndex !== -1) {
				tasks[existingTaskIndex] = task
			} else if (action === 'add') {
				tasks.push(task)
			}

			// Broadcast to all clients about the task update
			broadcastUpdate(action, task)
		}
	})

	ws.on('close', () => {
		console.log('Client disconnected.')
	})
})

// Function to broadcast task updates to all connected clients
function broadcastUpdate(action, task) {
	const message = JSON.stringify({
		type: 'updateTasks',
		action,
		task,
	})

	// Send update to each WebSocket client
	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message)
		}
	})
}

console.log('WebSocket server is running on port 3000')
