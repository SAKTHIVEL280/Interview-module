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
        
        console.log(`Loading project data for ID: ${projectId}`);
        const data = await fetchProjectData(projectId);
        
        if (isMounted) {
          console.log('Project data loaded successfully:', data);
          setProjectData(data);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project data';
          console.error('Error in useProjectData:', errorMessage);
          setError(errorMessage);
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
        .then((data) => {
          console.log('Project data refetched:', data);
          setProjectData(data);
        })
        .catch((err) => {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project data';
          console.error('Error in refetch:', errorMessage);
          setError(errorMessage);
        })
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
