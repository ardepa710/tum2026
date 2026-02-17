export interface GroupDetailResponse {
  group: {
    id: string;
    displayName: string;
    description: string | null;
    mail: string | null;
    mailNickname: string | null;
    mailEnabled: boolean;
    securityEnabled: boolean;
    groupTypes: string[];
    membershipRule: string | null;
    membershipRuleProcessingState: string | null;
    visibility: string | null;
    createdDateTime: string;
    renewedDateTime: string | null;
    expirationDateTime: string | null;
    proxyAddresses: string[];
  };
  members: GroupMember[];
  owners: GroupOwner[];
}

export interface GroupMember {
  "@odata.type": string;
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName?: string;
  accountEnabled?: boolean;
  jobTitle?: string | null;
}

export interface GroupOwner {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName?: string;
}
