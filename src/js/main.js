document.addEventListener('DOMContentLoaded', () => {
	console.log('XLSX:', typeof XLSX)

	// Select DOM elements
	const taskForm = document.getElementById('task-form')
	const taskList = document.getElementById('task-list')
	const completedTasksSection = document.querySelector('.completed-tasks')
	const completedTaskList = document.getElementById('completed-task-list')
	const viewCompletedTasksBtn = document.getElementById('view-completed-tasks')
	const backToActiveTasksBtn = document.getElementById('back-to-active-tasks')
	const filterStatus = document.getElementById('filter-status')
	const sortTasks = document.getElementById('sort-tasks')
	const deleteAllTasksBtn = document.getElementById('delete-all-tasks') // Delete All Tasks Button
	const exportToExcelBtn = document.getElementById('export-to-excel') // Export to Excel Button

	// Initialize an empty array to store tasks
	let tasks = []

	// Connect to WebSocket server
	let socket

	function connectWebSocket() {
		socket = new WebSocket('wss://hermesapp.online/')

		socket.onopen = () => {
			console.log('Connected to WebSocket server.')
		}

		socket.onmessage = event => {
			const message = JSON.parse(event.data)
			console.log('Received message:', message)

			if (message.type === 'initialSync') {
				tasks = message.tasks
				renderAllTasks()
			} else if (message.type === 'updateTasks') {
				const { action, task } = message

				const existingTaskIndex = tasks.findIndex(t => t.id === task.id)
				if (existingTaskIndex !== -1) {
					tasks[existingTaskIndex] = task
				} else if (action === 'add') {
					tasks.push(task)
				}

				renderAllTasks()
			}
		}

		socket.onerror = error => {
			console.error('WebSocket error:', error)
		}

		socket.onclose = () => {
			console.log('WebSocket connection closed. Retrying in 3 seconds...')
			setTimeout(connectWebSocket, 3000)
		}
	}

	connectWebSocket()

	// Function to send data to WebSocket server
	function syncWithServer(action, task) {
		if (socket.readyState === WebSocket.OPEN) {
			const message = {
				type: 'updateTasks',
				action,
				task,
			}
			console.log('Sending message to server:', message) // Log the message being sent
			socket.send(JSON.stringify(message))
		} else {
			console.warn('WebSocket is not open. Message not sent:', { action, task })
		}
		console.log('Attempting to send message:', { action, task })
	}

	// Handle form submission
	taskForm.addEventListener('submit', event => {
		event.preventDefault()

		const unitNumber = document.getElementById('unit-number').value.trim()
		const location = document.getElementById('location').value.trim()
		const action = document.getElementById('action').value
		const destination = document.getElementById('destination').value.trim()
		const message = document.getElementById('message').value.trim()

		if (!unitNumber || !location || !action || !destination) {
			alert('All required fields must be filled out.')
			return
		}

		const newTask = {
			id: Date.now().toString(),
			unitNumber,
			location,
			action,
			destination,
			message,
			status: 'neutral',
			startedAt: null,
			completedAt: null,
			duration: null,
		}

		console.log('New task to add:', newTask) // Log the task being added

		tasks.push(newTask)
		syncWithServer('add', newTask)
		renderAllTasks()
		taskForm.reset()
	})

	// Render all tasks
	function renderAllTasks() {
		taskList.innerHTML = ''
		completedTaskList.innerHTML = ''

		const filter = filterStatus.value
		const sortBy = sortTasks.value

		const sortedTasks = [...tasks].sort((a, b) => {
			// 1. Tasks with the "attention" status go to the top of the list
			if (a.status === 'attention' && b.status !== 'attention') return -1
			if (b.status === 'attention' && a.status !== 'attention') return 1

			// 2. If both tasks have the "attention" status, sort by the time the status was assigned
			if (a.status === 'attention' && b.status === 'attention') {
				return new Date(a.attentionAt) - new Date(b.attentionAt)
			}

			// 3. The rest of the tasks are sorted by the selected criterion
			if (sortBy === 'unitNumber') {
				return a.unitNumber.localeCompare(b.unitNumber)
			} else if (sortBy === 'created') {
				return a.id - b.id
			}
			return 0
		})

		sortedTasks.forEach(task => {
			if (filter === 'all' || task.status === filter) {
				if (task.status === 'completed') {
					renderCompletedTask(task)
				} else {
					renderTask(task)
				}
			}
		})
	}

	// Render individual task
	function renderTask(task) {
		const li = document.createElement('li')
		li.dataset.id = task.id
		li.classList.add(task.status)

		li.innerHTML = `
            <span><strong>${task.unitNumber}</strong> - ${task.location}</span>
            <span>${task.action} → ${task.destination}</span>
            <span>${task.message || 'No message'}</span>
            <div>
                <button class="edit-message-btn">Edit Message</button>
                <button class="in-progress-btn">In Progress</button>
                <button class="completed-btn">Complete</button>
                <button class="attention-btn">Attention</button>
            </div>
        `
		taskList.appendChild(li)
	}

	// Render individual completed task
	function renderCompletedTask(task) {
		const li = document.createElement('li')
		li.dataset.id = task.id
		li.classList.add('completed')

		li.innerHTML = `
            <span><strong>${task.unitNumber}</strong> - ${task.location}</span>
            <span>${task.action} → ${task.destination}</span>
            <span>${task.message || 'No message'}</span>
            <button class="restore-btn">Restore</button>
        `
		completedTaskList.appendChild(li)
	}

	// Handle export to Excel
	exportToExcelBtn.addEventListener('click', () => {
		console.log('Export button clicked') // Log when button is clicked
		const completedTasks = tasks.filter(task => task.status === 'completed')

		if (completedTasks.length === 0) {
			alert('No completed tasks to export.')
			return
		}

		const excelData = completedTasks.map(task => ({
			'Unit Number': task.unitNumber,
			Location: task.location,
			Action: task.action,
			Destination: task.destination,
			Message: task.message || 'No message',
			Status: task.status,
			'Started At': task.startedAt || 'Not started',
			'Completed At': task.completedAt || 'Not completed',
			Duration: task.duration || 'N/A',
		}))

		const workbook = XLSX.utils.book_new()
		const worksheet = XLSX.utils.json_to_sheet(excelData)
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Completed Tasks')
		XLSX.writeFile(workbook, 'Completed_Tasks_Report.xlsx')
	})

	// Handle list toggling
	viewCompletedTasksBtn.addEventListener('click', () => {
		document.querySelector('.task-list').style.display = 'none'
		completedTasksSection.style.display = 'block'
	})

	backToActiveTasksBtn.addEventListener('click', () => {
		completedTasksSection.style.display = 'none'
		document.querySelector('.task-list').style.display = 'block'
	})

	// Handle task actions
	taskList.addEventListener('click', event => {
		const target = event.target
		const taskElement = target.closest('li')
		const taskId = taskElement.dataset.id

		const task = tasks.find(t => t.id === taskId)
		if (!task) return

		if (target.classList.contains('edit-message-btn')) {
			const newMessage = prompt('Enter new message:', task.message || '')
			if (newMessage !== null) {
				task.message = newMessage.trim()
				syncWithServer('update', task)
				renderAllTasks()
			}
		} else if (target.classList.contains('in-progress-btn')) {
			task.status = task.status === 'in-progress' ? 'neutral' : 'in-progress'
			if (task.status === 'in-progress' && !task.startedAt) {
				task.startedAt = new Date().toISOString() // Record the start time when task is in progress
			}
			syncWithServer('update', task)
			renderAllTasks()
		} else if (target.classList.contains('completed-btn')) {
			task.status = 'completed'
			task.completedAt = new Date().toISOString() // Record the completion time
			if (task.startedAt) {
				const durationInMinutes = Math.round((new Date(task.completedAt) - new Date(task.startedAt)) / 60000) // Calculate duration in minutes
				task.duration = `${durationInMinutes} min` // Add the "min" suffix
			}
			syncWithServer('update', task)
			renderAllTasks()
		} else if (target.classList.contains('attention-btn')) {
			task.status = task.status === 'attention' ? 'neutral' : 'attention'
			syncWithServer('update', task)
			renderAllTasks()
		}
	})

	// Restore tasks from completed
	completedTaskList.addEventListener('click', event => {
		const target = event.target

		if (target.classList.contains('restore-btn')) {
			const taskId = target.closest('li').dataset.id
			const task = tasks.find(t => t.id === taskId)

			if (task) {
				task.status = 'neutral'
				syncWithServer('update', task)
				renderAllTasks()
			}
		}
	})

	// Handle delete all tasks with confirmation
	deleteAllTasksBtn.addEventListener('click', () => {
		if (confirm('Are you sure you want to delete all tasks? This action cannot be undone.')) {
			tasks = [] // Clear all tasks
			syncWithServer('clear', null) // Optionally send clear action to WebSocket server
			renderAllTasks()
		}
	})
})
