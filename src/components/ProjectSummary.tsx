import React from 'react';
import { useProjectData } from '@/hooks/use-project-data';

interface ProjectSummaryProps {
  projectId: string;
}

const ProjectSummary: React.FC<ProjectSummaryProps> = ({ projectId }) => {
  const { projectData, isLoading, error, refetch } = useProjectData(projectId);

  if (isLoading) {
    return (
      <div className="text-gray-400 text-sm flex items-center gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
        Loading summary...
      </div>
    );
  }
  
  if (error) {
    // Check if it's a "project not found" error
    const isProjectNotFound = error.includes('not found') || error.includes('does not exist');
    
    return (
      <div className="text-center">
        <div className={`text-sm mb-3 ${isProjectNotFound ? 'text-amber-600' : 'text-red-500'}`}>
          <div className="font-medium mb-1">
            {isProjectNotFound ? '⚠️ Project Not Found' : '❌ Unable to Load Summary'}
          </div>
          <div className="text-xs text-gray-600 mb-2">
            {isProjectNotFound 
              ? `Project "${projectId}" could not be found in the system.`
              : error
            }
          </div>
          {isProjectNotFound && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border-l-4 border-blue-200">
              <div className="font-medium mb-1">💡 Suggestions:</div>
              <div>• Check the project ID in the URL</div>
              <div>• Try a known project ID like: 3000609</div>
              <div>• Contact your administrator for valid project IDs</div>
            </div>
          )}
        </div>
        <button
          onClick={refetch}
          className={`px-3 py-2 rounded text-xs font-medium hover:opacity-80 transition-colors ${
            isProjectNotFound 
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
        >
          {isProjectNotFound ? 'Try Again' : 'Retry'}
        </button>
      </div>
    );
  }
  
  if (!projectData?.summary) {
    return (
      <div className="text-gray-400 text-sm">
        No summary available for this project.
      </div>
    );
  }
  
  return (
    <div className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
      {projectData.summary}
    </div>
  );
};

export default ProjectSummary;
