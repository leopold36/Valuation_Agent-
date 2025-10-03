import React, { useState, useEffect } from 'react';
import { Project } from './types';
import DatabaseViewer from './DatabaseViewer';
import './App.css';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [showDbViewer, setShowDbViewer] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectList = await window.electronAPI.projects.getAll();
      setProjects(projectList);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    try {
      const newProject = await window.electronAPI.projects.create(projectName.trim(), '');
      setProjects(prev => [newProject, ...prev]);
      setShowCreateDialog(false);
      setProjectName('');
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  };

  const handleDeleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await window.electronAPI.projects.delete(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
  };

  const handleGoHome = () => {
    setShowDbViewer(false);
    setSelectedProject(null);
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1
                onClick={handleGoHome}
                className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
              >
                My Electron App
              </h1>
              {selectedProject && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm text-gray-700">{selectedProject.name}</span>
                </>
              )}
              {showDbViewer && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-sm text-gray-700">Database</span>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDbViewer(true)}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Database
              </button>
              {!showDbViewer && !selectedProject && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  New Project
                </button>
              )}
            </div>
          </div>
        </div>

        <DatabaseViewer isOpen={showDbViewer} onClose={() => setShowDbViewer(false)} />

        {!showDbViewer && (
          <div className="p-4">
            {selectedProject ? (
              // Project Detail View
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900">{selectedProject.name}</h2>
                {selectedProject.description && (
                  <p className="text-gray-600 mt-2">{selectedProject.description}</p>
                )}
              </div>
            ) : (
              // Project List View
              <>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading...</div>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-2">No projects yet</div>
                    <div className="text-sm text-gray-500">Create your first project to get started</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => handleProjectClick(project)}
                        className="bg-white p-3 rounded border border-gray-200 hover:border-gray-300 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 text-sm">{project.name}</h3>
                            {project.description && (
                              <p className="text-xs text-gray-600 mt-1">{project.description}</p>
                            )}
                          </div>
                          <button
                            onClick={(e) => handleDeleteProject(project.id, e)}
                            className="opacity-0 group-hover:opacity-100 ml-3 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Create Project Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
              <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
              <form onSubmit={handleCreateProject}>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setProjectName('');
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;