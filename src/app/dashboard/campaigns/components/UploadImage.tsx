"use client";

export default function UploadImage() {
  const upload = async (e: any) => {
    const file = e.target.files[0];
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/edit-upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    alert("Uploaded: " + data.url);
  };

  return <input type="file" onChange={upload} />;
}
