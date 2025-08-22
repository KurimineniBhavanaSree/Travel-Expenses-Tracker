document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the settings page
    if (document.getElementById('accountForm')) {
        // Initialize tab functionality
        initSettingsTabs();
        
        // Set up form submissions
        setupAccountForm();
        setupPasswordForm();
    }
});

function initSettingsTabs() {
    const tabBtns = document.querySelectorAll('.settings-tabs .tab-btn');
    const tabContents = document.querySelectorAll('.settings-tabs .tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function setupAccountForm() {
    const accountForm = document.getElementById('accountForm');
    const accountMessage = document.getElementById('accountMessage');
    
    accountForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const newEmail = document.getElementById('newEmail').value;
        try {
            // Use absolute backend URL
            const response = await makeAuthenticatedRequest('http://localhost:5000/api/settings/email', 'PUT', {
                email: newEmail
            });
            if (response && response.ok) {
                accountMessage.textContent = 'Email updated successfully';
                accountMessage.className = 'message success';
                document.getElementById('currentEmail').value = newEmail;
                document.getElementById('newEmail').value = '';
            } else {
                let error = { message: 'Failed to update email' };
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    error = await response.json();
                }
                accountMessage.textContent = error.message || 'Failed to update email';
                accountMessage.className = 'message error';
            }
        } catch (error) {
            console.error('Error updating email:', error);
            accountMessage.textContent = 'An error occurred while updating your email';
            accountMessage.className = 'message error';
        }
    });
}

function setupPasswordForm() {
    const passwordForm = document.getElementById('passwordForm');
    const passwordMessage = document.getElementById('passwordMessage');
    
        passwordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (newPassword !== confirmPassword) {
                passwordMessage.textContent = 'New passwords do not match';
                passwordMessage.className = 'message error';
                return;
            }
            try {
                // Use absolute backend URL
                const response = await makeAuthenticatedRequest('http://localhost:5000/api/settings/password', 'PUT', {
                    currentPassword,
                    newPassword
                });
                if (response && response.ok) {
                    passwordMessage.textContent = 'Password updated successfully';
                    passwordMessage.className = 'message success';
                    // Reset form
                    passwordForm.reset();
                } else {
                    let error = { message: 'Failed to update password' };
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        error = await response.json();
                    }
                    passwordMessage.textContent = error.message || 'Failed to update password';
                    passwordMessage.className = 'message error';
                }
            } catch (error) {
                console.error('Error updating password:', error);
                passwordMessage.textContent = 'An error occurred while updating your password';
                passwordMessage.className = 'message error';
            }
        });
}