// public/js/register.js
document.addEventListener('DOMContentLoaded', () => {
    // Get the registration form element.
    const registerForm = document.getElementById('registerForm');

    // Helper function to show a notification.
    async function showNotification(messageKey, type = "info") {
        const message = await getTranslation(messageKey);
        let notificationContainer = document.getElementById("notificationContainer");
        if (!notificationContainer) {
            notificationContainer = document.createElement("div");
            notificationContainer.id = "notificationContainer";
            notificationContainer.className = "notification-container";
            document.body.prepend(notificationContainer);
        }
        const notification = document.createElement("div");
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => notification.classList.add("show"), 100);
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Listen for the form's submit event.
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Collect input values from the form.
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const isAdmin = document.getElementById('isAdmin').checked;

        // Create a FormData object to send both text and file data.
        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('isAdmin', isAdmin);

        // If an avatar file is provided, append it to the form data.
        const avatarFile = document.querySelector('input[name="avatarFile"]').files[0];
        if (avatarFile) {
            formData.append('avatarFile', avatarFile);
        }

        // Send the registration data to the server.
        const response = await fetch('http://localhost:3000/api/users/register', {
            method: 'POST',
            body: formData,
        });

        // Handle the response.
        if (response.ok) {
            window.location.href = '/index.html?registered=true';
        } else {
            const result = await response.json();
            // If the error message indicates the user exists, show a notification.
            if (result.message === "User already exists") {
                showNotification("userAlreadyExists", "error");
            } else {
                // Otherwise, show a generic error notification.
                showNotification("errorOccurred", "error");
            }
        }
    });
});