import React from 'react';
import { useProjectData } from '@/hooks/use-project-data';

interface ProjectSummaryProps {
  projectId: string;
}

const ProjectSummary: React.FC<ProjectSummaryProps> = ({ projectId }) => {
  const { projectData, isLoading, error } = useProjectData(projectId);

  if (isLoading) {
    return <div className="text-gray-400 text-sm">Loading summary...</div>;
  }
  if (error) {
    return <div className="text-red-500 text-sm">Error loading summary: {error}</div>;
  }
  if (!projectData?.summary) {
    return <div className="text-gray-400 text-sm">No summary available.</div>;
  }
  return (
    <div className="text-gray-700 text-sm whitespace-pre-line">{projectData.summary}</div>
  );
};

export default ProjectSummary;
