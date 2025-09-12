// Login Page JavaScript for SafeTour

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeLoginPage();
});

// Initialize login page functionality
function initializeLoginPage() {
    initializeFormValidation();
    initializePasswordToggle();
    initializeSocialLogin();
    initializeFormSubmission();
    initializeKeyboardShortcuts();
    initializeRememberMe();
}

// Form validation
function initializeFormValidation() {
    const form = document.getElementById('loginForm');
    const inputs = form.querySelectorAll('input[required]');
    
    // Real-time validation
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(this);
            if (this.value.trim()) {
                validateField(this);
            }
        });
        
        // Remove validation on focus
        input.addEventListener('focus', function() {
            clearFieldError(this);
        });
    });
    
    // Form submission validation
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        let isValid = true;
        inputs.forEach(input => {
            if (!validateField(input)) {
                isValid = false;
            }
        });
        
        if (isValid) {
            handleFormSubmission(this);
        } else {
            // Focus on first invalid field
            const firstError = form.querySelector('.input-group.error input');
            if (firstError) {
                firstError.focus();
            }
        }
    });
}

// Field validation function
function validateField(field) {
    const value = field.value.trim();
    const fieldType = field.type;
    const fieldName = field.name;
    
    clearFieldError(field);
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required.');
        return false;
    }
    
    if (!value) return true; // If not required and empty, it's valid
    
    // Email validation
    if (fieldType === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, 'Please enter a valid email address.');
            return false;
        }
    }
    
    // Password validation
    if (fieldType === 'password') {
        if (value.length < 6) {
            showFieldError(field, 'Password must be at least 6 characters long.');
            return false;
        }
    }
    
    showFieldSuccess(field);
    return true;
}

// Show field error
function showFieldError(field, message) {
    const inputGroup = field.closest('.input-group');
    inputGroup.classList.add('error');
    inputGroup.classList.remove('success');
    
    // Remove existing error message
    const existingError = inputGroup.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorElement = document.createElement('span');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    inputGroup.parentNode.appendChild(errorElement);
    
    // Add shake animation
    inputGroup.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        inputGroup.style.animation = '';
    }, 500);
}

// Show field success
function showFieldSuccess(field) {
    const inputGroup = field.closest('.input-group');
    inputGroup.classList.add('success');
    inputGroup.classList.remove('error');
    
    // Remove error message
    const errorMessage = inputGroup.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// Clear field error
function clearFieldError(field) {
    const inputGroup = field.closest('.input-group');
    inputGroup.classList.remove('error', 'success');
    
    const errorMessage = inputGroup.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// Password toggle functionality
function initializePasswordToggle() {
    window.togglePassword = function() {
        const passwordInput = document.getElementById('password');
        const eyeIcon = document.getElementById('eyeIcon');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    };
}

// Social login functionality
function initializeSocialLogin() {
    const googleBtn = document.querySelector('.btn-social.google');
    const facebookBtn = document.querySelector('.btn-social.facebook');
    
    googleBtn.addEventListener('click', function() {
        handleSocialLogin('google');
    });
    
    facebookBtn.addEventListener('click', function() {
        handleSocialLogin('facebook');
    });
}

// Handle social login
function handleSocialLogin(provider) {
    const btn = document.querySelector(`.btn-social.${provider}`);
    const originalText = btn.innerHTML;
    
    // Show loading state
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Connecting...`;
    btn.disabled = true;
    
    // Simulate social login process
    setTimeout(() => {
        // In a real application, this would handle actual OAuth flow
        showNotification(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login is currently in development.`, 'info');
        
        // Restore button
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 2000);
}

// Form submission
function initializeFormSubmission() {
    // No additional setup needed as it's handled in initializeFormValidation
}

// Handle form submission
function handleFormSubmission(form) {
    const submitBtn = form.querySelector('.btn-login');
    const formData = new FormData(form);
    
    // Show loading state
    setLoadingState(submitBtn, true);
    
    // Get form values
    const email = formData.get('email');
    const password = formData.get('password');
    const remember = formData.get('remember');
    
    // Simulate API call
    setTimeout(() => {
        // In a real application, this would make an actual API call
        simulateLogin(email, password, remember)
            .then(response => {
                if (response.success) {
                    // Store session info if remember me is checked
                    if (remember) {
                        localStorage.setItem('rememberedEmail', email);
                    } else {
                        localStorage.removeItem('rememberedEmail');
                    }
                    
                    showNotification('Login successful! Welcome back to SafeTour.', 'success');
                    
                    // Redirect after successful login
                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 1500);
                } else {
                    showNotification(response.message || 'Login failed. Please check your credentials.', 'error');
                }
            })
            .catch(error => {
                showNotification('An error occurred. Please try again.', 'error');
                console.error('Login error:', error);
            })
            .finally(() => {
                setLoadingState(submitBtn, false);
            });
    }, 1500);
}

// Simulate login API call
function simulateLogin(email, password, remember) {
    return new Promise((resolve) => {
        // Simulate different responses based on input
        if (email === 'demo@safetour.com' && password === 'demo123') {
            resolve({
                success: true,
                user: {
                    id: 1,
                    email: email,
                    name: 'Demo User'
                }
            });
        } else if (email && password.length >= 6) {
            // Simulate successful login for valid format
            resolve({
                success: true,
                user: {
                    id: Math.floor(Math.random() * 1000),
                    email: email,
                    name: email.split('@')[0]
                }
            });
        } else {
            resolve({
                success: false,
                message: 'Invalid email or password. Try demo@safetour.com / demo123'
            });
        }
    });
}

// Loading state management
function setLoadingState(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Sign In';
    }
}

// Keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Enter key to submit form
        if (e.key === 'Enter' && !e.shiftKey) {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.form) {
                const submitBtn = activeElement.form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    activeElement.form.dispatchEvent(new Event('submit'));
                }
            }
        }
        
        // Tab navigation enhancement
        if (e.key === 'Tab') {
            const focusableElements = document.querySelectorAll(
                'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
            );
            
            const currentIndex = Array.from(focusableElements).indexOf(document.activeElement);
            
            if (e.shiftKey) {
                // Shift+Tab (backward)
                if (currentIndex === 0) {
                    e.preventDefault();
                    focusableElements[focusableElements.length - 1].focus();
                }
            } else {
                // Tab (forward)
                if (currentIndex === focusableElements.length - 1) {
                    e.preventDefault();
                    focusableElements[0].focus();
                }
            }
        }
    });
}

// Remember me functionality
function initializeRememberMe() {
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.querySelector('input[name="remember"]');
    
    // Load remembered email on page load
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
        rememberCheckbox.checked = true;
    }
    
    // Clear remembered email when unchecked
    rememberCheckbox.addEventListener('change', function() {
        if (!this.checked) {
            localStorage.removeItem('rememberedEmail');
        }
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconClass = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    }[type];
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles if not present
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                max-width: 400px;
                animation: slideInRight 0.3s ease;
                border-left: 4px solid var(--primary-color);
            }
            .notification.success { border-left-color: #22c55e; }
            .notification.error { border-left-color: #ef4444; }
            .notification.warning { border-left-color: #f59e0b; }
            .notification-content {
                display: flex;
                align-items: center;
                padding: 1rem;
                gap: 0.75rem;
            }
            .notification i:first-child {
                color: var(--primary-color);
                font-size: 1.25rem;
            }
            .notification.success i:first-child { color: #22c55e; }
            .notification.error i:first-child { color: #ef4444; }
            .notification.warning i:first-child { color: #f59e0b; }
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.25rem;
                color: #6b7280;
                margin-left: auto;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            .notification-close:hover {
                background: #f3f4f6;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Form auto-fill for demo
function fillDemoCredentials() {
    document.getElementById('email').value = 'demo@safetour.com';
    document.getElementById('password').value = 'demo123';
    showNotification('Demo credentials filled. Click Sign In to continue.', 'info');
}

// Add demo button for testing
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    if (form) {
        const demoBtn = document.createElement('button');
        demoBtn.type = 'button';
        demoBtn.className = 'btn-demo';
        demoBtn.textContent = 'Fill Demo Credentials';
        demoBtn.onclick = fillDemoCredentials;
        
        // Add demo button styles
        const demoStyles = document.createElement('style');
        demoStyles.textContent = `
            .btn-demo {
                width: 100%;
                padding: 0.5rem;
                background: #f3f4f6;
                color: #6b7280;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.875rem;
                cursor: pointer;
                margin-bottom: 1rem;
                transition: all 0.2s;
            }
            .btn-demo:hover {
                background: #e5e7eb;
                color: #374151;
            }
        `;
        document.head.appendChild(demoStyles);
        
        // Insert demo button before the login button
        const loginBtn = form.querySelector('.btn-login');
        form.insertBefore(demoBtn, loginBtn);
    }
});

// Expose functions to global scope if needed
window.togglePassword = function() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
};