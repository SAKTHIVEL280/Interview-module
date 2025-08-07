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
      <div className="w-full shadow-lg border-0 flex items-center z-10" style={{ backgroundColor: 'rgba(45,62,79,255)', minHeight: '64px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', padding: '0' }}>
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
      <div className="w-full shadow-lg border-0 flex items-center z-10" style={{ backgroundColor, minHeight: '64px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', padding: '0' }}>
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
    <div className="w-full shadow-lg border-0 flex items-center z-10" style={{ backgroundColor: 'rgba(45,62,79,255)', minHeight: '64px', fontFamily: 'Inter, Segoe UI, Arial, sans-serif', padding: '0' }}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(2, auto)',
          gap: 'min(10px, 1vw)',
          width: '100%',
          maxWidth: '100vw',
          alignItems: 'start',
          fontSize: 'clamp(9px, 1.2vw, 13px)',
          margin: '0 auto',
          padding: 'min(10px, 2vw)',
          boxSizing: 'border-box',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Project Id</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.projectId}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Project Number</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.projectNumber}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Project Ref Id</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.projectRefId}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Account ID</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.accountId}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Account Name</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', display: 'block', lineHeight: 1.2, maxHeight: '2.5em' }}>{data.accountName}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Country</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.country}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Currency</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.currency}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Industry</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{data.industry}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Program Name</span>
          <span style={{ fontSize: 'clamp(10px, 1.3vw, 13px)', color: '#ffffff', fontWeight: 700, whiteSpace: 'normal', wordBreak: 'break-word', overflow: 'hidden', display: 'block', lineHeight: 1.2, maxHeight: '2.5em' }}>{data.programName}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
          <span style={{ fontSize: 'clamp(8px, 1vw, 11px)', color: '#e5e7eb', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>Status</span>
          <span style={{ 
            fontSize: 'clamp(10px, 1.3vw, 13px)', 
            color: data.status?.toLowerCase() === 'active' ? '#4ade80' : '#ffffff', 
            fontWeight: 800, 
            whiteSpace: 'nowrap', 
            textOverflow: 'ellipsis', 
            overflow: 'hidden' 
          }}>{data.status}</span>
        </div>
      </div>
    </div>
  );
};

export default TopNavBar;
