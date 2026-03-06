export const CRM_LEAD_STATUSES = [
  "New Lead",
  "Contacted",
  "Interested",
  "Demo Scheduled",
  "Negotiation",
  "Won",
  "Lost",
] as const;

export const CRM_DEAL_STAGES = [
  "New Lead",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;

export const CRM_TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const CRM_TASK_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"] as const;
export const CRM_APPOINTMENT_STATUSES = ["Scheduled", "Completed", "Cancelled"] as const;

export type CrmLeadStatus = (typeof CRM_LEAD_STATUSES)[number];
export type CrmDealStage = (typeof CRM_DEAL_STAGES)[number];
export type CrmTaskPriority = (typeof CRM_TASK_PRIORITIES)[number];
export type CrmTaskStatus = (typeof CRM_TASK_STATUSES)[number];
export type CrmAppointmentStatus = (typeof CRM_APPOINTMENT_STATUSES)[number];

export const DEFAULT_CRM_LEAD_STATUS: CrmLeadStatus = "New Lead";
export const DEFAULT_CRM_DEAL_STAGE: CrmDealStage = "New Lead";
export const DEFAULT_CRM_TASK_PRIORITY: CrmTaskPriority = "Medium";
export const DEFAULT_CRM_TASK_STATUS: CrmTaskStatus = "Pending";
export const DEFAULT_CRM_APPOINTMENT_STATUS: CrmAppointmentStatus = "Scheduled";

export const CRM_LEAD_SOURCES = ["WhatsApp", "Website", "Ads", "Manual", "Import"] as const;
