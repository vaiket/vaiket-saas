"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, Hash, AlertCircle, Search, Filter, ChevronRight, MoreVertical, Eye, Edit, Trash2, Loader2 } from "lucide-react";

interface Project {
  id: number;
  name: string;
  projectCode: string;
  status: string;
  createdAt: string;
  description?: string;
  progress?: number;
}

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400" },
  RUNNING: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  PAUSED: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  FAILED: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  COMPLETED: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
};

export default function EmailBrandingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      // Simulate API delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));
      const res = await fetch("/api/automation-projects/list");
      const json = await res.json();
      if (json.success) {
        setProjects(json.projects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
                         project.projectCode.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: "Draft",
      RUNNING: "Running",
      PAUSED: "Paused",
      FAILED: "Failed",
      COMPLETED: "Completed"
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Glassmorphism */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  Automation Projects
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your email automation & branding projects
                </p>
              </div>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
              >
                <Filter size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/email-branding/create")}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={18} className="transition-transform group-hover:scale-110" />
                <span className="whitespace-nowrap">Create Project</span>
              </button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden items-center gap-2 md:flex">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filterStatus === "ALL" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
              >
                All ({projects.length})
              </button>
              {Object.entries(statusStyles).map(([status, style]) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${filterStatus === status ? style.bg + " " + style.text : "text-gray-600 hover:bg-gray-100"}`}
                >
                  <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                  {getStatusLabel(status)} ({statusCounts[status] || 0})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Menu */}
      {showMobileMenu && (
        <div className="border-b border-gray-200 bg-white p-4 md:hidden">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${filterStatus === "ALL" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}
            >
              All ({projects.length})
            </button>
            {Object.entries(statusStyles).map(([status, style]) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${filterStatus === status ? style.bg + " " + style.text : "bg-gray-100 text-gray-700"}`}
              >
                <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-gray-500">Loading projects...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
            <div className="rounded-full bg-gray-100 p-4">
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {search || filterStatus !== "ALL" ? "No matching projects" : "No projects yet"}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              {search || filterStatus !== "ALL"
                ? "Try adjusting your search or filter to find what you're looking for."
                : "Create your first automation project to get started with email branding."}
            </p>
            {(search || filterStatus !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilterStatus("ALL");
                }}
                className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Total Projects</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Running</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{statusCounts.RUNNING || 0}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Draft</p>
                <p className="mt-1 text-2xl font-bold text-gray-600">{statusCounts.DRAFT || 0}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-500">Paused</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{statusCounts.PAUSED || 0}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm lg:block hidden">
                <p className="text-sm text-gray-500">Failed</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">{statusCounts.FAILED || 0}</p>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-blue-500/20"
                >
                  <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="rounded-lg p-2 hover:bg-gray-100">
                      <MoreVertical size={18} className="text-gray-500" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="pr-8">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyles[project.status]?.bg} ${statusStyles[project.status]?.text}`}>
                            <span className="flex items-center gap-1.5">
                              <div className={`h-1.5 w-1.5 rounded-full ${statusStyles[project.status]?.dot}`} />
                              {getStatusLabel(project.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Hash size={14} className="text-gray-400" />
                          <span className="font-mono">{project.projectCode}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={14} className="text-gray-400" />
                          <span>Created {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>

                      {/* Progress Bar (if applicable) */}
                      {project.progress !== undefined && (
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
                      <button
                        onClick={() => router.push(`/dashboard/email-branding/${project.id}`)}
                        className="group/btn flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        View Details
                        <ChevronRight size={16} className="transition-transform group-hover/btn:translate-x-0.5" />
                      </button>
                      
                      <div className="flex items-center gap-2">
                        <button className="rounded-lg p-2 hover:bg-gray-100">
                          <Eye size={16} className="text-gray-500" />
                        </button>
                        <button className="rounded-lg p-2 hover:bg-gray-100">
                          <Edit size={16} className="text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More (if applicable) */}
            {filteredProjects.length > 6 && (
              <div className="mt-8 text-center">
                <button className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
                  Load More Projects
                </button>
              </div>
            )}
          </>
        )}

        {/* Quick Stats Footer */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h3 className="text-lg font-semibold">Need help with automation?</h3>
              <p className="mt-1 text-sm text-gray-300">
                Check our documentation or contact support
              </p>
            </div>
            <div className="flex gap-3">
              <button className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/20">
                View Docs
              </button>
              <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}