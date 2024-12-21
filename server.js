const WebSocket = require('ws')

// Store tasks in memory
let tasks = []

// Create WebSocket server
const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', ws => {
	console.log('Client connected.')

	// Send existing tasks to the newly connected client
	ws.send(JSON.stringify({ type: 'initialSync', tasks }))

	// Handle incoming message from a client
	ws.on('message', message => {
		try {
			const data = JSON.parse(message)
			console.log('Received message:', data)

			if (data.type === 'updateTasks') {
				const { action, task } = data

				// Update task in memory
				const existingTaskIndex = tasks.findIndex(t => t.id === task.id)
				if (existingTaskIndex !== -1) {
					tasks[existingTaskIndex] = task
				} else if (action === 'add') {
					tasks.push(task)
				}

				// Broadcast updated task to all clients
				broadcastUpdate(action, task)
			}
		} catch (error) {
			console.error('Error handling message:', error.message)
		}
	})

	ws.on('close', () => {
		console.log('Client disconnected.')
	})

	ws.on('error', error => {
		console.error('WebSocket error:', error.message)
	})
})

// Broadcast updated task to all connected clients
function broadcastUpdate(action, task) {
	const message = JSON.stringify({
		type: 'updateTasks',
		action,
		task,
	})

	wss.clients.forEach(client => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message)
		}
	})
}

console.log('WebSocket server is running on port 8080')
