import { useState, useEffect } from 'react';
import { ProjectData, fetchProjectData } from '@/lib/api';

export const useProjectData = (projectId: string) => {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProjectData = async () => {
      if (!projectId) {
        setError('Project ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const data = await fetchProjectData(projectId);
        
        if (isMounted) {
          setProjectData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch project data');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProjectData();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const refetch = () => {
    if (projectId) {
      setIsLoading(true);
      setError(null);
      fetchProjectData(projectId)
        .then(setProjectData)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch project data'))
        .finally(() => setIsLoading(false));
    }
  };

  return {
    projectData,
    isLoading,
    error,
    refetch
  };
};
