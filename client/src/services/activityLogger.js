import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

/**
 * Helper to get authentication token
 */
const getToken = () => localStorage.getItem('token');

/**
 * Fires a silent logging request to the backend.
 * @param {string} actionType - 'login', 'logout', 'add', 'edit', 'delete', 'view_report', 'export_report', 'other'
 * @param {string} actionTarget - Specific entity, e.g. "sales:SA-5" or "item:12"
 * @param {string} description - Human readable info about the action
 */
export const emitUserAction = async (actionType, actionTarget, description = '') => {
  try {
    const token = getToken();
    const userRole = localStorage.getItem('role') || 'Unknown'; 
    const userId = localStorage.getItem('userId');
    
    // Safety check - Can't log if we don't have basic auth
    if (!token || !userId) return;

    // Send asynchronously without awaiting the main UI thread wherever possible
    axios.post(`${API_URL}/activity-log`, {
      userId,
      role: userRole,
      actionType,
      actionTarget,
      description
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(err => {
      // Only debug explicitly if needed, otherwise suppress to keep console clean
      // console.warn('Activity Logger Warn:', err.message);
    });

  } catch (err) {
    // Fail silently so it doesn't break user flow
    console.warn("Client logger failure - suppressing error.", err.message);
  }
}
