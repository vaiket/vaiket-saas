"use client";

import { useEffect, useState } from "react";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Loader2, MailCheck, Trash2, Pencil } from "lucide-react";

export default function SMTPManagementPage() {
  const [loading, setLoading] = useState(false);
  const [smtpList, setSmtpList] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    host: "",
    port: "",
    username: "",
    password: "",
    fromEmail: "",
    secure: true,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testStatus, setTestStatus] = useState("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSMTP = async () => {
    const res = await fetch("/api/mail-accounts-smtp/list");
    const data = await res.json();
    if (data.success) setSmtpList(data.list);
  };

  useEffect(() => {
    loadSMTP();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const saveSMTP = async () => {
    setLoading(true);
    const method = formData.id ? "PUT" : "POST";
    const endpoint = formData.id
      ? "/api/mail-accounts-smtp/update"
      : "/api/mail-accounts-smtp/create";

    const res = await fetch(endpoint, {
      method,
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      setIsDialogOpen(false);
      loadSMTP();
    }
  };

  const deleteSMTP = async (id: number) => {
    if (!confirm("Delete this SMTP?")) return;

    await fetch("/api/mail-accounts-smtp/delete", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });

    loadSMTP();
  };

  const testSMTP = async (smtp: any) => {
    setTestStatus("TESTING");
    setErrorMessage("");

    const res = await fetch("/api/mail-accounts-smtp/test", {
      method: "POST",
      body: JSON.stringify(smtp),
    });

    const data = await res.json();

    if (data.success) {
      setTestStatus("SUCCESS");
      setTimeout(() => setTestStatus("IDLE"), 2000);
    } else {
      setTestStatus("ERROR");
      setErrorMessage(data.error);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-white text-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold">SMTP Management</h1>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-black text-white hover:bg-gray-800"
              onClick={() => {
                setFormData({
                  id: null,
                  host: "",
                  port: "",
                  username: "",
                  password: "",
                  fromEmail: "",
                  secure: true,
                });
              }}
            >
              + Add SMTP
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md bg-white rounded-xl border shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {formData.id ? "Edit SMTP" : "Add SMTP"}
            </h2>

            <div className="space-y-4">
              <Input
                placeholder="Host"
                value={formData.host}
                onChange={(e) => handleChange("host", e.target.value)}
              />
              <Input
                placeholder="Port"
                value={formData.port}
                onChange={(e) => handleChange("port", e.target.value)}
              />
              <Input
                placeholder="Username"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
              <Input
                placeholder="From Email"
                value={formData.fromEmail}
                onChange={(e) => handleChange("fromEmail", e.target.value)}
              />

              <div className="flex items-center justify-between">
                <p>Use SSL</p>
                <Switch
                  checked={formData.secure}
                  onCheckedChange={(v) => handleChange("secure", v)}
                />
              </div>

              <Button
                disabled={loading}
                onClick={saveSMTP}
                className="w-full bg-black text-white hover:bg-gray-800"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Save SMTP"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* SMTP LIST */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {smtpList.map((smtp: any) => (
          <Card
            key={smtp.id}
            className="bg-white border shadow-sm hover:shadow-md transition rounded-xl"
          >
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{smtp.host}</span>
                <span className="text-sm text-gray-500">#{smtp.id}</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-gray-700">
                <b>Email:</b> {smtp.fromEmail}
              </p>
              <p className="text-sm text-gray-700">
                <b>User:</b> {smtp.username}
              </p>

              <div className="flex gap-2 pt-3">
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => testSMTP(smtp)}
                >
                  {testStatus === "TESTING" ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <MailCheck size={18} />
                  )}
                </Button>

                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => {
                    setFormData(smtp);
                    setIsDialogOpen(true);
                  }}
                >
                  <Pencil size={18} />
                </Button>

                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => deleteSMTP(smtp.id)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>

              {testStatus === "SUCCESS" && (
                <p className="text-green-600 text-sm mt-2">
                  ✅ SMTP Connected Successfully
                </p>
              )}

              {testStatus === "ERROR" && (
                <p className="text-red-600 text-sm mt-2">
                  ❌ {errorMessage}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
