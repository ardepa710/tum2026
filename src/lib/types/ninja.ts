// NinjaOne RMM API type definitions

export interface NinjaOrganization {
  id: number;
  name: string;
  description?: string;
  nodeApprovalMode?: "AUTOMATIC" | "MANUAL" | "REJECT";
  tags?: string[];
  fields?: Record<string, unknown>;
  userData?: Record<string, unknown>;
}

export interface NinjaLocation {
  id: number;
  name: string;
  address?: string;
  description?: string;
  userData?: Record<string, unknown>;
  tags?: string[];
  fields?: Record<string, unknown>;
}

export interface NinjaPolicy {
  id: number;
  name: string;
  description?: string;
}

export interface NinjaOrganizationDetailed extends NinjaOrganization {
  locations?: NinjaLocation[];
  policies?: NinjaPolicy[];
}

export type NinjaNodeClass =
  | "WINDOWS_SERVER"
  | "WINDOWS_WORKSTATION"
  | "LINUX_WORKSTATION"
  | "MAC"
  | "ANDROID"
  | "APPLE_IOS"
  | "APPLE_IPADOS"
  | "VMWARE_VM_HOST"
  | "VMWARE_VM_GUEST"
  | "HYPERV_VMM_HOST"
  | "HYPERV_VMM_GUEST"
  | "LINUX_SERVER"
  | "MAC_SERVER"
  | "CLOUD_MONITOR_TARGET"
  | "NMS_SWITCH"
  | "NMS_ROUTER"
  | "NMS_FIREWALL"
  | "NMS_PRINTER"
  | "NMS_OTHER"
  | "NMS_SERVER"
  | "UNMANAGED_DEVICE"
  | "MANAGED_DEVICE";

export interface NinjaMaintenanceStatus {
  status?: string;
  start?: number;
  end?: number;
  reasonMessage?: string;
}

export interface NinjaDevice {
  id: number;
  uid?: string;
  organizationId: number;
  locationId?: number;
  nodeClass?: NinjaNodeClass;
  nodeRoleId?: number;
  approvalStatus?: "PENDING" | "APPROVED";
  offline?: boolean;
  displayName?: string;
  systemName?: string;
  dnsName?: string;
  netbiosName?: string;
  created?: number;
  lastContact?: number;
  lastUpdate?: number;
  userData?: Record<string, unknown>;
  tags?: string[];
  fields?: Record<string, unknown>;
  maintenance?: NinjaMaintenanceStatus;
  ipAddresses?: string[];
  macAddresses?: string[];
  publicIP?: string;
  deviceType?: string;
  references?: {
    organization?: NinjaOrganization;
    location?: NinjaLocation;
    rolePolicy?: NinjaPolicy;
    policy?: NinjaPolicy;
  };
}

export interface NinjaAlert {
  uid: string;
  deviceId?: number;
  message?: string;
  createTime?: number;
  updateTime?: number;
  sourceType?: string;
  sourceName?: string;
  subject?: string;
  severity?: string;
  priority?: string;
  device?: NinjaDevice;
}

export interface NinjaDisk {
  deviceId: number;
  model?: string;
  interfaceType?: string;
  size?: number;
  partitions?: Array<{
    name?: string;
    fileSystem?: string;
    capacity?: number;
    freeSpace?: number;
  }>;
}

export interface NinjaVolume {
  deviceId: number;
  name?: string;
  label?: string;
  fileSystem?: string;
  capacity?: number;
  freeSpace?: number;
}

export interface NinjaProcessor {
  deviceId: number;
  name?: string;
  architecture?: string;
  maxClockSpeed?: number;
  currentClockSpeed?: number;
  numberOfCores?: number;
  numberOfLogicalProcessors?: number;
}

export interface NinjaNetworkInterface {
  deviceId: number;
  name?: string;
  adapterName?: string;
  ipAddress?: string;
  macAddress?: string;
  speed?: number;
}

export interface NinjaSoftware {
  deviceId: number;
  name?: string;
  publisher?: string;
  version?: string;
  installDate?: string;
  size?: number;
  location?: string;
}

export interface NinjaOsPatch {
  deviceId: number;
  name?: string;
  kbNumber?: string;
  severity?: string;
  status?: string;
  type?: string;
  installedOn?: number;
}

export interface NinjaWindowsService {
  deviceId: number;
  serviceId?: string;
  serviceName?: string;
  displayName?: string;
  state?: string;
  startType?: string;
  userName?: string;
}

export interface NinjaLastLoggedOnUser {
  deviceId: number;
  userName?: string;
  logonTime?: number;
}
