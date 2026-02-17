export interface UserDetailResponse {
  user: {
    id: string;
    displayName: string;
    mail: string | null;
    userPrincipalName: string;
    accountEnabled: boolean;
    jobTitle: string | null;
    department: string | null;
    companyName: string | null;
    officeLocation: string | null;
    mobilePhone: string | null;
    businessPhones: string[];
    createdDateTime: string;
    lastPasswordChangeDateTime: string | null;
    signInActivity?: {
      lastSignInDateTime: string | null;
      lastNonInteractiveSignInDateTime: string | null;
    };
  };
  memberOf: MemberOfEntry[];
  licenses: LicenseDetail[];
  mailboxSettings: MailboxSettings | null;
  manager: ManagerInfo | null;
}

export interface MemberOfEntry {
  "@odata.type": string;
  id: string;
  displayName: string;
  description: string | null;
  groupTypes?: string[];
}

export interface LicenseDetail {
  id: string;
  skuId: string;
  skuPartNumber: string;
  servicePlans: ServicePlan[];
}

export interface ServicePlan {
  servicePlanId: string;
  servicePlanName: string;
  provisioningStatus: string;
}

export interface MailboxSettings {
  timeZone: string | null;
  language: {
    locale: string;
    displayName: string;
  } | null;
  workingHours?: {
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
    timeZone: { name: string };
  };
  automaticRepliesSetting?: {
    status: string;
  };
}

export interface ManagerInfo {
  id: string;
  displayName: string;
  jobTitle: string | null;
  mail: string | null;
  mobilePhone: string | null;
}
