import { UserSettings } from '../types';

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
    apiBaseUrl: 'http://localhost:3002',
    riskSensitivity: 'medium',
    whitelistedDomains: []
};

/**
 * Storage key for settings
 */
const SETTINGS_KEY = 'userSettings';

// Fallback for non-extension environments (dev/test)
let mockStore: Record<string, any> = {};

const mockStorage = {
    get: (keys: any, callback: (result: any) => void) => {
        callback(mockStore);
    },
    set: (items: any, callback?: () => void) => {
        mockStore = { ...mockStore, ...items };
        if (callback) callback();
    }
};

const storage = (typeof chrome !== 'undefined' && chrome.storage)
    ? chrome.storage.sync
    : mockStorage;

/**
 * Get all user settings with defaults applied
 */
export async function getSettings(): Promise<UserSettings> {
    return new Promise((resolve) => {
        try {
            storage.get(SETTINGS_KEY, (result) => {
                const settings = result[SETTINGS_KEY] || {};
                resolve({
                    ...DEFAULT_SETTINGS,
                    ...settings,
                    // Ensure valid enum value
                    riskSensitivity: ['low', 'medium', 'high'].includes(settings.riskSensitivity)
                        ? settings.riskSensitivity
                        : DEFAULT_SETTINGS.riskSensitivity
                });
            });
        } catch (error) {
            console.warn('Failed to load settings:', error);
            resolve(DEFAULT_SETTINGS);
        }
    });
}

/**
 * Save user settings (partial updates supported)
 */
export async function saveSettings(settings: Partial<UserSettings>): Promise<void> {
    const current = await getSettings();
    const updated = { ...current, ...settings };

    return new Promise((resolve, reject) => {
        try {
            storage.set({ [SETTINGS_KEY]: updated }, () => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Check if a domain is whitelisted
 */
export async function isWhitelisted(url: string): Promise<boolean> {
    try {
        const { whitelistedDomains } = await getSettings();
        if (!whitelistedDomains || whitelistedDomains.length === 0) return false;

        const hostname = new URL(url).hostname;
        return whitelistedDomains.some(domain =>
            hostname === domain || hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}
