import CampaignEditor from "./components/CampaignEditor";

export default function CampaignsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">📢 Email Campaign</h1>

      <div className="bg-white rounded-xl shadow-md p-6">
        <CampaignEditor />
      </div>
    </div>
  );
}
