"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

export default function UsersManagement() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
  }

  useEffect(() => {
    load();
  }, [page]);

  // Apply search + filters
  async function applyFilters() {
    setPage(1);
    load();
  }

  // Save or update customer
  async function save() {
    const url = form.id ? "/api/customers/update" : "/api/customers/add";

    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.success) {
      alert("Saved!");
      setShowForm(false);
      resetForm();
      load();
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
    if (!confirm("Delete this customer?")) return;
    const res = await fetch("/api/customers/delete", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    await res.json();
    load();
  }

  async function deleteBulk() {
    if (!confirm("Delete selected customers?")) return;

    await fetch("/api/customers/delete", {
      method: "POST",
      body: JSON.stringify({ ids: selected }),
    });

    setSelected([]);
    load();
  }

  // Export CSV
  function exportCSV() {
    window.location.href = "/api/customers/export";
  }

  // Import CSV
  function importCSV(e: any) {
    const file = e.target.files[0];
    Papa.parse(file, {
      header: true,
      complete: async function (results) {
        await fetch("/api/customers/import", {
          method: "POST",
          body: JSON.stringify(results.data),
        });

        alert("Imported!");
        load();
      },
    });
  }

  function toggleSelect(id: number) {
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id));
    else setSelected([...selected, id]);
  }

  function toggleSelectAll() {
    if (selected.length === customers.length) setSelected([]);
    else setSelected(customers.map((c: any) => c.id));
  }

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex justify-between mb-5">
        <h1 className="text-3xl font-bold">Customers</h1>

        <div className="flex gap-3">
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + Add Customer
          </button>

          <button
            onClick={deleteBulk}
            className="bg-red-600 text-white px-4 py-2 rounded"
            disabled={selected.length === 0}
          >
            Delete Selected ({selected.length})
          </button>

          <button
            onClick={exportCSV}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Export CSV
          </button>

          <input
            type="file"
            accept=".csv"
            className="border px-2 py-1 rounded"
            onChange={importCSV}
          />
        </div>
      </div>

      {/* SEARCH + FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
        <input
          placeholder="Search name, email, mobile"
          className="border p-2 rounded col-span-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border p-2 rounded"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="fresh">Fresh</option>
          <option value="hot">Hot</option>
          <option value="cool">Cool</option>
        </select>

        <input
          placeholder="State"
          className="border p-2 rounded"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        />

        <input
          placeholder="Pincode"
          className="border p-2 rounded"
          value={pincodeFilter}
          onChange={(e) => setPincodeFilter(e.target.value)}
        />

        <button
          onClick={applyFilters}
          className="bg-black text-white rounded px-4"
        >
          Apply
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded border">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={selected.length === customers.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-2">Full Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Mobile</th>
              <th className="p-2">State</th>
              <th className="p-2">Pincode</th>
              <th className="p-2">Type</th>
              <th className="p-2">Joined</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {customers.map((cus: any) => (
              <tr key={cus.id} className="border-b">
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(cus.id)}
                    onChange={() => toggleSelect(cus.id)}
                  />
                </td>

                <td className="p-2">{cus.fullName}</td>
                <td className="p-2">{cus.email}</td>
                <td className="p-2">{cus.mobile}</td>
                <td className="p-2">{cus.state}</td>
                <td className="p-2">{cus.pincode}</td>
                <td className="p-2 capitalize">{cus.customerType}</td>
                <td className="p-2">{new Date(cus.createdAt).toLocaleDateString()}</td>

                <td className="p-2">
                  <button
                    onClick={() => editCustomer(cus)}
                    className="text-blue-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteSingle(cus.id)}
                    className="text-red-600 ml-3"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {customers.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={9}>
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          className="px-3 py-1 border rounded"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Prev
        </button>

        <div className="px-3 py-1">Page {page}</div>

        <button
          className="px-3 py-1 border rounded"
          disabled={page * perPage >= total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>

      {/* ADD/EDIT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded shadow p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {form.id ? "Edit Customer" : "Add Customer"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <input
                className="border p-2 rounded col-span-2"
                placeholder="Full Name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="Mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="State"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="Country"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />

              <input
                className="border p-2 rounded"
                placeholder="Pincode"
                value={form.pincode}
                onChange={(e) =>
                  setForm({ ...form, pincode: e.target.value })
                }
              />

              <select
                className="border p-2 rounded col-span-2"
                value={form.customerType}
                onChange={(e) =>
                  setForm({ ...form, customerType: e.target.value })
                }
              >
                <option value="">Select Type</option>
                <option value="fresh">Fresh</option>
                <option value="hot">Hot</option>
                <option value="cool">Cool</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>

              <button
                onClick={save}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
