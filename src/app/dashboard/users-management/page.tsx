"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

export default function UsersManagement() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const perPage = 50;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [form, setForm] = useState({
    id: null,
    fullName: "",
    email: "",
    mobile: "",
    state: "",
    country: "",
    pincode: "",
    customerType: "",
  });

  const [showForm, setShowForm] = useState(false);

  // Load customers from API
  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search,
        type: typeFilter,
        state: stateFilter,
        pincode: pincodeFilter,
        from: fromDate,
        to: toDate,
      });

      const res = await fetch(`/api/customers/list?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setCustomers(data.customers);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to load customers:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [page]);

  // Apply search + filters
  async function applyFilters() {
    setPage(1);
    await load();
  }

  // Save or update customer
  async function save() {
    const url = form.id ? "/api/customers/update" : "/api/customers/add";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.success) {
      setShowForm(false);
      resetForm();
      await load();
    } else {
      alert(data.error);
    }
  }

  function resetForm() {
    setForm({
      id: null,
      fullName: "",
      email: "",
      mobile: "",
      state: "",
      country: "",
      pincode: "",
      customerType: "",
    });
  }

  function editCustomer(cus: any) {
    setForm(cus);
    setShowForm(true);
  }

  async function deleteSingle(id: number) {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    
    const res = await fetch("/api/customers/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    
    await res.json();
    await load();
  }

  async function deleteBulk() {
    if (!confirm(`Are you sure you want to delete ${selected.length} customers?`)) return;

    await fetch("/api/customers/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: selected }),
    });

    setSelected([]);
    await load();
  }

  // Export CSV
  function exportCSV() {
    window.location.href = "/api/customers/export";
  }

  // Import CSV
  function importCSV(e: any) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: async function (results) {
        await fetch("/api/customers/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(results.data),
        });

        await load();
        e.target.value = ""; // Reset file input
      },
    });
  }

  function toggleSelect(id: number) {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      setSelected([...selected, id]);
    }
  }

  function toggleSelectAll() {
    if (selected.length === customers.length) {
      setSelected([]);
    } else {
      setSelected(customers.map((c: any) => c.id));
    }
  }

  // Clear all filters
  function clearFilters() {
    setSearch("");
    setTypeFilter("");
    setStateFilter("");
    setPincodeFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50/30 p-4 lg:p-8">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600 mt-2">Manage your customer database efficiently</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl"
            >
              <PlusIcon className="w-5 h-5" />
              Add Customer
            </button>

            <button
              onClick={deleteBulk}
              disabled={selected.length === 0}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
            >
              <TrashIcon className="w-5 h-5" />
              Delete ({selected.length})
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-xl"
            >
              <DownloadIcon className="w-5 h-5" />
              Export CSV
            </button>

            <label className="inline-flex items-center gap-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md">
              <UploadIcon className="w-5 h-5" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={importCSV}
              />
            </label>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Selected</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{selected.length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Page</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{customers.length}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <DocumentIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Current Page</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{page}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                placeholder="Search name, email, mobile..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="fresh">Fresh</option>
              <option value="hot">Hot</option>
              <option value="cool">Cool</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <input
              placeholder="State"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
            <input
              placeholder="Pincode"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value)}
            />
          </div>

          <div className="flex gap-2 items-end">
            <button
              onClick={applyFilters}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl"
            >
              Apply
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-medium transition-all duration-200"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    checked={selected.length === customers.length && customers.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {customers.map((cus: any) => (
                <tr key={cus.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      checked={selected.includes(cus.id)}
                      onChange={() => toggleSelect(cus.id)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{cus.fullName}</div>
                      <div className="text-sm text-gray-500">ID: {cus.id}</div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{cus.email}</div>
                    <div className="text-sm text-gray-500">{cus.mobile}</div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{cus.state}</div>
                    <div className="text-sm text-gray-500">{cus.pincode}</div>
                  </td>

                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      cus.customerType === 'fresh' ? 'bg-green-100 text-green-800' :
                      cus.customerType === 'hot' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {cus.customerType}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm text-gray-900">
                    {new Date(cus.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editCustomer(cus)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </button>

                      <button
                        onClick={() => deleteSingle(cus.id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium text-sm transition-colors duration-200"
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="text-gray-500">
                      <UsersIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No customers found</p>
                      <p className="mt-1">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(page - 1) * perPage + 1}</span> to{" "}
          <span className="font-medium">{Math.min(page * perPage, total)}</span> of{" "}
          <span className="font-medium">{total}</span> results
        </div>

        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.ceil(total / perPage) }, (_, i) => i + 1)
              .filter(p => p === 1 || p === Math.ceil(total / perPage) || Math.abs(p - page) <= 2)
              .map((p, index, array) => (
                <div key={p} className="flex items-center">
                  {index > 0 && array[index - 1] !== p - 1 && (
                    <span className="px-2 text-gray-500">...</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      page === p
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {p}
                  </button>
                </div>
              ))}
          </div>

          <button
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={page * perPage >= total}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ADD/EDIT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {form.id ? "Edit Customer" : "Add New Customer"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter full name"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter mobile number"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter state"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter country"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
                  <input
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    placeholder="Enter pincode"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white"
                    value={form.customerType}
                    onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    <option value="fresh">Fresh</option>
                    <option value="hot">Hot</option>
                    <option value="cool">Cool</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>

                <button
                  onClick={save}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-xl"
                >
                  {form.id ? "Update Customer" : "Create Customer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon components
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}