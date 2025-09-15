// Signup Page JavaScript for Travault

// Global variables
let currentStep = 1;
const totalSteps = 3;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSignupPage();
});

// Initialize signup page functionality
function initializeSignupPage() {
    initializeStepNavigation();
    initializeFormValidation();
    initializePasswordToggle();
    initializePasswordStrength();
    initializeSocialSignup();
    initializeFormSubmission();
    initializeCountrySelection();
    initializeCustomCheckboxes();
}

// Step navigation functionality
function initializeStepNavigation() {
    updateProgressBar();
    
    // Next step function
    window.nextStep = function() {
        if (validateCurrentStep()) {
            if (currentStep < totalSteps) {
                currentStep++;
                showStep(currentStep);
                updateProgressBar();
            }
        }
    };
    
    // Previous step function
    window.prevStep = function() {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
            updateProgressBar();
        }
    };
}

// Show specific step
function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show current step
    const currentStepElement = document.getElementById(`step${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
        
        // Focus on first input of the step
        setTimeout(() => {
            const firstInput = currentStepElement.querySelector('input:not([type="checkbox"]):not([type="radio"])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
}

// Update progress bar
function updateProgressBar() {
    const progressSteps = document.querySelectorAll('.progress-step');
    
    progressSteps.forEach((step, index) => {
        const stepNumber = index + 1;
        
        if (stepNumber < currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNumber === currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

// Validate current step
function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const requiredFields = currentStepElement.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    // Additional validation for specific steps
    if (currentStep === 3) {
        // Validate password match
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showFieldError(document.getElementById('confirmPassword'), 'Passwords do not match.');
            isValid = false;
        }
        
        // Validate terms acceptance
        const termsCheckbox = document.querySelector('input[name="terms"]');
        const dataProcessingCheckbox = document.querySelector('input[name="dataProcessing"]');
        
        if (!termsCheckbox.checked) {
            showNotification('Please accept the Terms of Service to continue.', 'error');
            isValid = false;
        }
        
        if (!dataProcessingCheckbox.checked) {
            showNotification('Please consent to data processing to continue.', 'error');
            isValid = false;
        }
    }
    
    return isValid;
}

// Form validation
function initializeFormValidation() {
    const inputs = document.querySelectorAll('input[required], select[required]');
    
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
    });
}

// Field validation
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
    
    // Phone validation
    if (fieldType === 'tel') {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            showFieldError(field, 'Please enter a valid phone number.');
            return false;
        }
    }
    
    // Password validation
    if (fieldType === 'password' && fieldName === 'password') {
        return validatePassword(field);
    }
    
    // Confirm password validation
    if (fieldName === 'confirmPassword') {
        const password = document.getElementById('password').value;
        if (value !== password) {
            showFieldError(field, 'Passwords do not match.');
            return false;
        }
    }
    
    // Date validation (age check)
    if (fieldType === 'date' && fieldName === 'dateOfBirth') {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 13) {
            showFieldError(field, 'You must be at least 13 years old to sign up.');
            return false;
        }
        
        if (age > 120) {
            showFieldError(field, 'Please enter a valid birth date.');
            return false;
        }
    }
    
    // ZIP code validation
    if (fieldName === 'zipCode') {
        const zipRegex = /^[0-9]{5}(?:-[0-9]{4})?$|^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/;
        if (!zipRegex.test(value)) {
            showFieldError(field, 'Please enter a valid ZIP/postal code.');
            return false;
        }
    }
    
    showFieldSuccess(field);
    return true;
}

// Password validation with strength checking
function validatePassword(field) {
    const password = field.value;
    const minLength = 8;
    
    if (password.length < minLength) {
        showFieldError(field, `Password must be at least ${minLength} characters long.`);
        return false;
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase) {
        showFieldError(field, 'Password must contain at least one uppercase letter.');
        return false;
    }
    
    if (!hasLowerCase) {
        showFieldError(field, 'Password must contain at least one lowercase letter.');
        return false;
    }
    
    if (!hasNumbers) {
        showFieldError(field, 'Password must contain at least one number.');
        return false;
    }
    
    if (!hasSpecialChar) {
        showFieldError(field, 'Password must contain at least one special character.');
        return false;
    }
    
    showFieldSuccess(field);
    return true;
}

// Show field error
function showFieldError(field, message) {
    const inputGroup = field.closest('.input-group') || field.closest('.form-group');
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
}

// Show field success
function showFieldSuccess(field) {
    const inputGroup = field.closest('.input-group') || field.closest('.form-group');
    inputGroup.classList.add('success');
    inputGroup.classList.remove('error');
    
    const errorMessage = inputGroup.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// Clear field error
function clearFieldError(field) {
    const inputGroup = field.closest('.input-group') || field.closest('.form-group');
    inputGroup.classList.remove('error', 'success');
    
    const errorMessage = inputGroup.parentNode.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// Password toggle functionality
function initializePasswordToggle() {
    window.togglePassword = function(fieldId) {
        const passwordInput = document.getElementById(fieldId);
        const eyeIcon = passwordInput.nextElementSibling.querySelector('i');
        
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

// Password strength indicator
function initializePasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (passwordInput && strengthFill && strengthText) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            
            updatePasswordStrengthUI(strength, strengthFill, strengthText);
        });
    }
}

// Calculate password strength
function calculatePasswordStrength(password) {
    let score = 0;
    let feedback = [];
    
    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('at least 8 characters');
    
    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('uppercase letter');
    
    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('lowercase letter');
    
    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('number');
    
    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('special character');
    
    return {
        score: score,
        feedback: feedback,
        level: score <= 2 ? 'weak' : score <= 3 ? 'fair' : score <= 4 ? 'good' : 'strong'
    };
}

// Update password strength UI
function updatePasswordStrengthUI(strength, strengthFill, strengthText) {
    // Remove existing classes
    strengthFill.className = 'strength-fill';
    
    // Add new class based on strength
    if (strength.score > 0) {
        strengthFill.classList.add(strength.level);
    }
    
    // Update text
    const strengthLabels = {
        weak: 'Weak',
        fair: 'Fair', 
        good: 'Good',
        strong: 'Strong'
    };
    
    strengthText.textContent = `Password strength: ${strengthLabels[strength.level] || 'Weak'}`;
    
    if (strength.feedback.length > 0 && strength.score < 5) {
        strengthText.textContent += ` (needs: ${strength.feedback.join(', ')})`;
    }
}

// Social signup functionality
function initializeSocialSignup() {
    const googleBtn = document.querySelector('.btn-social.google');
    const facebookBtn = document.querySelector('.btn-social.facebook');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            handleSocialSignup('google');
        });
    }
    
    if (facebookBtn) {
        facebookBtn.addEventListener('click', function() {
            handleSocialSignup('facebook');
        });
    }
}

// Handle social signup
function handleSocialSignup(provider) {
    const btn = document.querySelector(`.btn-social.${provider}`);
    const originalText = btn.innerHTML;
    
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Connecting...`;
    btn.disabled = true;
    
    setTimeout(() => {
        showNotification(`${provider.charAt(0).toUpperCase() + provider.slice(1)} signup is currently in development.`, 'info');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 2000);
}

// Form submission
function initializeFormSubmission() {
    const form = document.getElementById('signupForm');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateCurrentStep()) {
            handleFormSubmission(this);
        }
    });
}

// Handle form submission
function handleFormSubmission(form) {
    const submitBtn = form.querySelector('.btn-signup');
    const formData = new FormData(form);
    
    // Show loading state
    setLoadingState(submitBtn, true);
    
    // Collect form data
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        dateOfBirth: formData.get('dateOfBirth'),
        gender: formData.get('gender'),
        phone: formData.get('phone'),
        country: formData.get('country'),
        address: formData.get('address'),
        city: formData.get('city'),
        zipCode: formData.get('zipCode'),
        emergencyContactName: formData.get('emergencyContactName'),
        emergencyContactPhone: formData.get('emergencyContactPhone'),
        emergencyContactRelation: formData.get('emergencyContactRelation'),
        preferences: {
            safetyAlerts: formData.get('safetyAlerts') === 'on',
            emergencyNotifications: formData.get('emergencyNotifications') === 'on',
            travelTips: formData.get('travelTips') === 'on',
            communityUpdates: formData.get('communityUpdates') === 'on'
        }
    };
    
    // Simulate API call
    setTimeout(() => {
        simulateSignup(userData)
            .then(response => {
                if (response.success) {
                    showNotification('Account created successfully! Welcome to SafeTour.', 'success');
                    
                    // Redirect after successful signup
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    showNotification(response.message || 'Signup failed. Please try again.', 'error');
                }
            })
            .catch(error => {
                showNotification('An error occurred. Please try again.', 'error');
                console.error('Signup error:', error);
            })
            .finally(() => {
                setLoadingState(submitBtn, false);
            });
    }, 2000);
}

// Simulate signup API call
function simulateSignup(userData) {
    return new Promise((resolve) => {
        // Simulate email already exists check
        if (userData.email === 'test@example.com') {
            resolve({
                success: false,
                message: 'An account with this email already exists.'
            });
        } else {
            resolve({
                success: true,
                user: {
                    id: Math.floor(Math.random() * 1000),
                    email: userData.email,
                    name: `${userData.firstName} ${userData.lastName}`
                }
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
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    } else {
        button.classList.remove('loading');
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || 'Create Account';
    }
}

// Country selection enhancement
function initializeCountrySelection() {
    const countrySelect = document.getElementById('country');
    
    if (countrySelect) {
        // Add more countries to the select options
        const additionalCountries = [
            { value: 'CN', name: 'China' },
            { value: 'RU', name: 'Russia' },
            { value: 'ZA', name: 'South Africa' },
            { value: 'AR', name: 'Argentina' },
            { value: 'EG', name: 'Egypt' },
            { value: 'TR', name: 'Turkey' },
            { value: 'TH', name: 'Thailand' },
            { value: 'SG', name: 'Singapore' },
            { value: 'MY', name: 'Malaysia' },
            { value: 'ID', name: 'Indonesia' }
        ];
        
        additionalCountries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.value;
            option.textContent = country.name;
            countrySelect.appendChild(option);
        });
        
        // Sort countries alphabetically
        const options = Array.from(countrySelect.options).slice(1); // Skip first "Select" option
        options.sort((a, b) => a.textContent.localeCompare(b.textContent));
        
        // Clear and rebuild select
        countrySelect.innerHTML = '<option value="">Select your country</option>';
        options.forEach(option => countrySelect.appendChild(option));
    }
}

// Custom checkbox functionality
function initializeCustomCheckboxes() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkmark = this.nextElementSibling;
            if (checkmark && checkmark.classList.contains('checkmark')) {
                if (this.checked) {
                    checkmark.style.background = 'var(--primary-color)';
                    checkmark.style.borderColor = 'var(--primary-color)';
                } else {
                    checkmark.style.background = 'white';
                    checkmark.style.borderColor = 'var(--gray-300)';
                }
            }
        });
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
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
                align-items: flex-start;
                padding: 1rem;
                gap: 0.75rem;
            }
            .notification i:first-child {
                color: var(--primary-color);
                font-size: 1.25rem;
                margin-top: 0.125rem;
            }
            .notification.success i:first-child { color: #22c55e; }
            .notification.error i:first-child { color: #ef4444; }
            .notification.warning i:first-child { color: #f59e0b; }
            .notification span {
                flex: 1;
                line-height: 1.5;
            }
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 0.25rem;
                color: #6b7280;
                border-radius: 4px;
                transition: background-color 0.2s;
                margin-top: -0.125rem;
            }
            .notification-close:hover {
                background: #f3f4f6;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 7 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 7000);
}

// Keyboard navigation for steps
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        const activeElement = document.activeElement;
        
        // If on a next/previous button, click it
        if (activeElement && (activeElement.classList.contains('btn-next') || activeElement.classList.contains('btn-prev'))) {
            activeElement.click();
            return;
        }
        
        // If in a form field, go to next step or submit
        if (activeElement && activeElement.form) {
            if (currentStep < totalSteps) {
                if (validateCurrentStep()) {
                    nextStep();
                }
            } else {
                // On last step, submit form
                const submitBtn = document.querySelector('.btn-signup');
                if (submitBtn && !submitBtn.disabled) {
                    document.getElementById('signupForm').dispatchEvent(new Event('submit'));
                }
            }
        }
    }
});

// Form auto-save to localStorage (optional enhancement)
function initializeAutoSave() {
    const form = document.getElementById('signupForm');
    const inputs = form.querySelectorAll('input, select');
    
    // Load saved data
    inputs.forEach(input => {
        const savedValue = localStorage.getItem(`signup_${input.name}`);
        if (savedValue && input.type !== 'password') {
            input.value = savedValue;
            if (input.type === 'checkbox') {
                input.checked = savedValue === 'true';
            }
        }
    });
    
    // Save on input
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.type === 'password') return; // Don't save passwords
            
            const value = this.type === 'checkbox' ? this.checked : this.value;
            localStorage.setItem(`signup_${this.name}`, value);
        });
    });
    
    // Clear saved data on successful submission
    form.addEventListener('submit', function() {
        inputs.forEach(input => {
            localStorage.removeItem(`signup_${input.name}`);
        });
    });
}

// Initialize auto-save if desired
// initializeAutoSave();