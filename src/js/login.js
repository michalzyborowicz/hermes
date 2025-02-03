// Get DOM elements
const loginForm = document.getElementById('login-form')
const errorMessage = document.getElementById('error-message')

// Handle form submission
loginForm.addEventListener('submit', async event => {
	event.preventDefault() // Prevent form from submitting normally

	const username = document.getElementById('username').value
	const password = document.getElementById('password').value

	// Send login request to the server
	const response = await fetch('https://hermesapp.online/login', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ username, password }), // Send username and password in the request body
	})

	const data = await response.json() // Get DOM elements
	const loginForm = document.getElementById('login-form')
	const errorMessage = document.getElementById('error-message')

	// Handle form submission
	loginForm.addEventListener('submit', async event => {
		event.preventDefault() // Prevent form from submitting normally

		// Get the values entered by the user
		const username = document.getElementById('username').value
		const password = document.getElementById('password').value

		try {
			// Send login request to the server
			const response = await fetch('https://hermesapp.online/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }), // Send username and password in the request body
			})

			const data = await response.json()

			if (response.ok) {
				// On success, store the token and redirect to the main page
				localStorage.setItem('auth_token', data.token)
				window.location.href = '/' // Redirect to the main page
			} else {
				// On error, display the error message
				errorMessage.textContent = data.error || 'An error occurred. Please try again.'
			}
		} catch (err) {
			// Handle any errors that may occur during fetch
			console.error('Error during login:', err)
			errorMessage.textContent = 'An error occurred while attempting to log in.'
		}
	})

	if (response.ok) {
		// On success, store the token and redirect to the main page
		localStorage.setItem('auth_token', data.token)
		window.location.href = '/' // Redirect to the main page
	} else {
		// On error, display the error message
		errorMessage.textContent = data.error || 'An error occurred. Please try again.'
	}
})
