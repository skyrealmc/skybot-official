/**
 * Sky Realms SMP - Whitelist Application
 * Client-side validation + backend API integration.
 */

const WHITELIST_STORAGE_KEY = 'skyrealms-whitelist-applications-v1';
const API_ENDPOINT = 'https://skybot.up.railway.app/api/whitelist/apply';

function isValidMinecraftUsername(username) {
    return /^[A-Za-z0-9_]{3,16}$/.test(username);
}

function isValidDiscordId(discordId) {
    return /^\d{17,19}$/.test(discordId);
}

function showWhitelistMessage(element, text, type) {
    element.textContent = text;
    element.classList.remove('success', 'error');
    element.classList.add(type);
}

function loadApplications() {
    try {
        const raw = localStorage.getItem(WHITELIST_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function saveApplications(applications) {
    localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(applications));
}

async function submitToBackend(minecraftUsername, discordUsername, email, age, retryCount = 0) {
    const maxRetries = 2;
    
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                minecraftUsername,
                discordId: discordUsername,
                email,
                age
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }

        return { success: true, data };
    } catch (error) {
        // If it's a network error and we haven't exhausted retries, retry
        if ((error instanceof TypeError || error.message.includes('fetch')) && retryCount < maxRetries) {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
            return submitToBackend(minecraftUsername, discordUsername, email, age, retryCount + 1);
        }
        
        // Add context to fetch errors
        if (error instanceof TypeError || error.message.includes('fetch')) {
            error.isNetworkError = true;
        }
        
        throw error;
    }
}

function initWhitelistForm() {
    const form = document.getElementById('whitelistForm');
    const message = document.getElementById('whitelistMessage');
    const applyButton = document.getElementById('whitelistApplyBtn');
    const applyOverlay = document.getElementById('whitelistApplyOverlay');
    const applicationsOpen = form?.dataset.applicationsOpen === 'true';

    if (!form || !message) return;

    if (applyButton) {
        applyButton.disabled = !applicationsOpen;
    }

    if (applyOverlay) {
        applyOverlay.hidden = applicationsOpen;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!applicationsOpen) {
            showWhitelistMessage(
                message,
                'Whitelist applications are currently closed. Join Discord chat for launch updates and the next application window.',
                'error'
            );
            return;
        }

        const minecraftUsername = form.minecraftUsername.value.trim();
        const discordUsername = form.discordUsername.value.trim();
        const email = form.email.value.trim();
        const age = Number(form.age.value);
        const agreeRules = form.agreeRules.checked;

        if (!isValidMinecraftUsername(minecraftUsername)) {
            showWhitelistMessage(
                message,
                'Use a valid Minecraft username (3-16 chars, letters/numbers/underscore only).',
                'error'
            );
            return;
        }

        if (!discordUsername || !isValidDiscordId(discordUsername)) {
            showWhitelistMessage(message, 'Enter a valid Discord ID (17-19 digits). You can find your ID by enabling Developer Mode in Discord settings and right-clicking your profile.', 'error');
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showWhitelistMessage(message, 'Enter a valid email address.', 'error');
            return;
        }

        if (!Number.isInteger(age) || age < 13 || age > 99) {
            showWhitelistMessage(message, 'Age must be a number between 13 and 99.', 'error');
            return;
        }

        if (!agreeRules) {
            showWhitelistMessage(message, 'You must agree to the rules before applying.', 'error');
            return;
        }

        applyButton.disabled = true;
        showWhitelistMessage(message, 'Submitting your application...', 'info');

        try {
            const result = await submitToBackend(minecraftUsername, discordUsername, email, age);

            const applications = loadApplications();
            const application = {
                id: `WL-${Date.now()}`,
                minecraftUsername,
                discordUsername,
                email,
                age,
                status: 'pending',
                submittedAt: new Date().toISOString()
            };
            applications.push(application);
            saveApplications(applications);

            showWhitelistMessage(
                message,
                `✓ Application submitted for ${minecraftUsername}! Check your email (${email}) for updates. Staff will review your application and announce results in Discord.`,
                'success'
            );

            form.reset();
        } catch (error) {
            let errorMessage = error.message || 'Failed to submit application. Please try again.';
            
            // Handle specific error types
            if (error.isNetworkError || error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error: Could not connect to the server. Please check your internet connection and try again. If the problem persists, contact staff in Discord.';
            } else if (error.message.includes('duplicate')) {
                errorMessage = 'You have already submitted an application. Please wait for staff review.';
            } else if (error.message.includes('closed')) {
                errorMessage = 'Whitelist applications are currently closed.';
            } else if (error.message.includes('Invalid')) {
                errorMessage = `Validation error: ${error.message}`;
            }

            showWhitelistMessage(message, errorMessage, 'error');
            console.error('Application submission error:', error);
        } finally {
            applyButton.disabled = !applicationsOpen;
        }
    });
}

document.addEventListener('DOMContentLoaded', initWhitelistForm);

window.WhitelistFunctions = {
    initWhitelistForm,
    isValidMinecraftUsername
};
