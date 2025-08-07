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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const API_BASE_URL = 'http://localhost:5000';

export const fetchProjectData = async (projectId: string): Promise<ProjectData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/project/${projectId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result: ApiResponse<ProjectData> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch project data');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching project data:', error);
    throw error;
  }
};
