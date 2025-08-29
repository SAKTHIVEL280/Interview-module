// API utility functions

export interface ProjectData {
  projectId: string;
  projectNumber: string;
  projectRefId: string;
  accountId: string;
  accountName: string;
  country: string;
  currency: string;
  industry: string;
  programName: string;
  status: string;
  summary?: string;
}

export interface ContextHistoryEntry {
  id: number;
  type: 'user' | 'bot';
  text: string;
  timestamp: string;
  date: string;
  files?: Array<{url: string, name: string}>;
  sessionId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE_URL = 'http://localhost:5000';

export const fetchProjectData = async (projectId: string): Promise<ProjectData> => {
  try {
    console.log(`Fetching project data for ID: ${projectId}`);
    const response = await fetch(`${API_BASE_URL}/api/project/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers);
    
    // Handle specific HTTP status codes with user-friendly messages
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Project with ID "${projectId}" not found. Please check the project ID and try again.`);
      } else if (response.status === 500) {
        throw new Error('Server error occurred. Please try again later or contact support.');
      } else if (response.status === 403) {
        throw new Error('Access denied. You don\'t have permission to view this project.');
      } else if (response.status >= 500) {
        throw new Error('Server is temporarily unavailable. Please try again later.');
      } else if (response.status >= 400) {
        throw new Error(`Invalid request. Please check the project ID and try again.`);
      } else {
        throw new Error(`Connection error (Status: ${response.status}). Please check your internet connection.`);
      }
    }
    
    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but received:', text.substring(0, 200));
      throw new Error('Invalid response format received from server. Please try again.');
    }
    
    const result: ApiResponse<ProjectData> = await response.json();
    console.log('API response:', result);
    
    if (!result.success || !result.data) {
      // Handle API-level errors with user-friendly messages
      if (result.error && result.error.includes('No project found')) {
        throw new Error(`Project with ID "${projectId}" does not exist in the system.`);
      }
      throw new Error(result.error || 'Unable to load project data. Please try again.');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching project data:', error);
    
    // If it's a network error, try to provide more context
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Please ensure the server is running and try again.');
    }
    
    // Re-throw the error with the same message if it's already user-friendly
    throw error;
  }
};

// Context History API functions
export const fetchContextHistory = async (projectId: string): Promise<ContextHistoryEntry[]> => {
  try {
    console.log(`Fetching context history for project ID: ${projectId}`);
    const response = await fetch(`${API_BASE_URL}/api/context-history/${projectId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        // No context history found is not an error, return empty array
        return [];
      }
      throw new Error(`Failed to fetch context history: ${response.status}`);
    }
    
    const result: ApiResponse<ContextHistoryEntry[]> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch context history');
    }
    
    return result.data || [];
  } catch (error) {
    console.error('Error fetching context history:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Please ensure the server is running.');
    }
    
    throw error;
  }
};

export const saveContextHistory = async (
  projectId: string, 
  messageType: 'user' | 'bot', 
  messageText: string, 
  files?: Array<{url: string, name: string}>,
  sessionId?: string
): Promise<number> => {
  try {
    console.log(`Saving context history for project ${projectId}: ${messageType} message`);
    const response = await fetch(`${API_BASE_URL}/api/context-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        projectId,
        messageType,
        messageText,
        files,
        sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save context history: ${response.status}`);
    }
    
    const result: ApiResponse<{id: number}> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save context history');
    }
    
    return result.data?.id || 0;
  } catch (error) {
    console.error('Error saving context history:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Please ensure the server is running.');
    }
    
    throw error;
  }
};

export const clearContextHistory = async (projectId: string): Promise<number> => {
  try {
    console.log(`Clearing context history for project ID: ${projectId}`);
    const response = await fetch(`${API_BASE_URL}/api/context-history/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear context history: ${response.status}`);
    }
    
    const result: ApiResponse<{deletedCount: number}> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to clear context history');
    }
    
    return result.data?.deletedCount || 0;
  } catch (error) {
    console.error('Error clearing context history:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to the server. Please ensure the server is running.');
    }
    
    throw error;
  }
};
