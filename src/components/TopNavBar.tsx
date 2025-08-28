import React from 'react';
import { useProjectData } from '@/hooks/use-project-data';

interface TopNavBarProps {
  projectId: string;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ projectId }) => {
  const { projectData, isLoading, error, refetch } = useProjectData(projectId);

  // Show loading state
  if (isLoading) {
    return (
      <div className="w-full shadow-lg border-0 flex items-center z-10" style={{ backgroundColor: 'rgba(45,62,79,255)', minHeight: '64px', fontFamily: 'Lexend, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', padding: '0' }}>
        <div className="flex items-center justify-center w-full">
          <span className="text-white text-sm">Loading project data...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    // Check if it's a "project not found" error
    const isProjectNotFound = error.includes('not found') || error.includes('does not exist');
    const backgroundColor = isProjectNotFound ? 'rgba(239,68,68,255)' : 'rgba(139,69,19,255)';
    
    return (
      <div className="w-full shadow-lg border-0 flex items-center z-10" style={{ backgroundColor, minHeight: '64px', fontFamily: 'Lexend, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', padding: '0' }}>
        <div className="flex items-center justify-center w-full gap-4">
          <div className="flex flex-col items-center text-center">
            <span className="text-white text-sm font-medium">
              {isProjectNotFound ? `⚠️ Project "${projectId}" Not Found` : '❌ Error Loading Project Data'}
            </span>
            <span className="text-gray-200 text-xs mt-1">
              {isProjectNotFound 
                ? 'Please check the project ID in the URL and try again' 
                : error
              }
            </span>
          </div>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-white text-black rounded text-sm hover:bg-gray-100 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show project data or fallback
  const data = projectData || {
    projectId: 'N/A',
    projectNumber: 'N/A',
    projectRefId: 'N/A',
    accountId: 'N/A',
    accountName: 'N/A',
    country: 'N/A',
    currency: 'N/A',
    industry: 'N/A',
    programName: 'N/A',
    status: 'N/A'
  };

  return (
    <div className="w-full shadow-lg border-0 flex items-center z-10" style={{ backgroundColor: 'rgba(45,62,79,255)', minHeight: '80px', fontFamily: 'Lexend, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', padding: '0' }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '100vw', 
        margin: '0 auto', 
        padding: '16px 24px', 
        boxSizing: 'border-box' 
      }}>
        {/* Single Row Layout with automatic width adjustment */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'start',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '0 1 auto', minWidth: '120px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Project ID</span>
            <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600, lineHeight: '1.2', whiteSpace: 'nowrap' }}>{data.projectId}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '0 1 auto', minWidth: '130px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Project Number</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, lineHeight: '1.2', whiteSpace: 'nowrap' }}>{data.projectNumber}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '0 1 auto', minWidth: '100px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Account ID</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, lineHeight: '1.2', whiteSpace: 'nowrap' }}>{data.accountId}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: '200px', maxWidth: '300px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Project Name</span>
            <span style={{ 
              fontSize: '13px', 
              color: '#e2e8f0', 
              fontWeight: 600, 
              lineHeight: '1.3', 
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxHeight: '2.6em'
            }}>{data.programName}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minWidth: '180px', maxWidth: '250px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Account Name</span>
            <span style={{ 
              fontSize: '13px', 
              color: '#e2e8f0', 
              fontWeight: 600, 
              lineHeight: '1.3', 
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxHeight: '2.6em'
            }}>{data.accountName}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: '0 1 auto', minWidth: '80px' }}>
            <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Country</span>
            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, lineHeight: '1.2', whiteSpace: 'nowrap' }}>{data.country}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;
