import { getSettings, saveSettings } from '../services/storage';
import type { UserSettings } from '../types';

// UI Elements
const apiBaseUrlInput = document.getElementById('apiBaseUrl') as HTMLInputElement;
const whitelistTextarea = document.getElementById('whitelistedDomains') as HTMLTextAreaElement;
const riskRadios = document.querySelectorAll('input[name="riskSensitivity"]');
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

/**
 * Show status message
 */
function showStatus(message: string, type: 'success' | 'error' = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;

    setTimeout(() => {
        statusDiv.className = 'status';
    }, 3000);
}

/**
 * Load settings into UI
 */
async function loadOptions() {
    try {
        const settings = await getSettings();
        console.log('[Options] Loading settings:', settings);

        if (apiBaseUrlInput) {
            apiBaseUrlInput.value = settings.apiBaseUrl;
        }

        if (whitelistTextarea) {
            whitelistTextarea.value = settings.whitelistedDomains.join('\n');
        }

        riskRadios.forEach((radio) => {
            const input = radio as HTMLInputElement;
            if (input.value === settings.riskSensitivity) {
                input.checked = true;
            }
        });

    } catch (error) {
        console.error('[Options] Error loading settings:', error);
        showStatus('Failed to load settings', 'error');
    }
}

/**
 * Save settings from UI
 */
async function saveOptions() {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const apiBaseUrl = apiBaseUrlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash

        // Validate API URL
        try {
            new URL(apiBaseUrl); // Will check valid protocol/format
        } catch {
            showStatus('Invalid API URL format', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Settings';
            return;
        }

        const whitelistedDomains = whitelistTextarea.value
            .split('\n')
            .map(d => d.trim())
            .filter(d => d.length > 0);

        let riskSensitivity: UserSettings['riskSensitivity'] = 'medium';
        riskRadios.forEach((radio) => {
            const input = radio as HTMLInputElement;
            if (input.checked) {
                riskSensitivity = input.value as UserSettings['riskSensitivity'];
            }
        });

        const newSettings: Partial<UserSettings> = {
            apiBaseUrl,
            whitelistedDomains,
            riskSensitivity
        };

        console.log('[Options] Saving settings:', newSettings);
        await saveSettings(newSettings);

        showStatus('Settings saved successfully');
    } catch (error) {
        console.error('[Options] Error saving settings:', error);
        showStatus('Failed to save settings', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Settings';
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', loadOptions);

// Save handler
saveBtn.addEventListener('click', saveOptions);
