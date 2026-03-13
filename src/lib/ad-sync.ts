/**
 * AD Sync Service
 * Orchestrates SentinelAgent execution + PostgreSQL upsert for AD data.
 *
 * Sync strategies:
 * - fullSyncTenant(): All users + all groups + memberships. Used on initial setup or manual trigger.
 * - syncUser(): Single user refresh. Called after any write operation on a user.
 * - syncGroup(): Single group refresh (metadata + member count). Called after group operations.
 */

import { prisma } from "@/lib/prisma";
import { executePowerShell } from "@/lib/sentinel-agent";
import {
  PS_GET_ALL_USERS,
  PS_GET_ALL_GROUPS,
  psGetGroupMembers,
  psSyncUser,
  psSyncGroup,
} from "@/lib/ad-scripts";

// ─── Types matching PowerShell output ────────────────────────────────────────

interface PsAdUser {
  SamAccountName: string;
  Name: string | null;
  ObjectGuid: string | null;
  DisplayName: string;
  EmailAddress: string | null;
  UserPrincipalName: string;
  Enabled: boolean;
  LockedOut: boolean;
  Title: string | null;
  Department: string | null;
  Description: string | null;
  Manager: string | null;
  DistinguishedName: string | null;
  Building: string | null;
  MobilePhone: string | null;
  LastLogonDate: string | null;
  PasswordLastSet: string | null;
  PasswordExpired: boolean;
  WhenCreated: string | null;
}

interface PsAdGroup {
  SamAccountName: string;
  Name: string;
  Description: string | null;
  GroupCategory: string;
  GroupScope: string;
  MemberCount?: number;
}

interface PsGroupMember {
  SamAccountName: string;
  Name: string;
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * PowerShell outputs a JSON object (not array) when there's only one result.
 * This helper always returns an array.
 */
function parseJsonArray<T>(stdout: string): T[] {
  if (!stdout.trim()) return [];
  const parsed = JSON.parse(stdout.trim());
  return Array.isArray(parsed) ? parsed : [parsed];
}

function parseDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Full Tenant Sync ─────────────────────────────────────────────────────────

export interface SyncResult {
  usersUpserted: number;
  groupsUpserted: number;
  membershipsUpserted: number;
  errors: string[];
}

export async function fullSyncTenant(
  tenantId: number,
  agentId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    usersUpserted: 0,
    groupsUpserted: 0,
    membershipsUpserted: 0,
    errors: [],
  };

  // ── 1. Sync Users ──────────────────────────────────────────────────────────
  try {
    const usersResult = await executePowerShell(agentId, PS_GET_ALL_USERS, 180);
    if (usersResult.exitCode !== 0) {
      result.errors.push(`Get-ADUser failed: ${usersResult.stderr}`);
    } else {
      const psUsers = parseJsonArray<PsAdUser>(usersResult.stdout);
      for (const u of psUsers) {
        await prisma.adUser.upsert({
          where: {
            tenantId_samAccountName: {
              tenantId,
              samAccountName: u.SamAccountName,
            },
          },
          create: {
            tenantId,
            samAccountName: u.SamAccountName,
            objectGuid: u.ObjectGuid ?? null,
            name: u.Name ?? null,
            displayName: u.DisplayName,
            mail: u.EmailAddress ?? null,
            upn: u.UserPrincipalName,
            accountEnabled: u.Enabled,
            lockedOut: u.LockedOut,
            jobTitle: u.Title ?? null,
            department: u.Department ?? null,
            description: u.Description ?? null,
            manager: u.Manager ?? null,
            distinguishedName: u.DistinguishedName ?? null,
            building: u.Building ?? null,
            mobilePhone: u.MobilePhone ?? null,
            lastLogonDate: parseDate(u.LastLogonDate),
            passwordLastSet: parseDate(u.PasswordLastSet),
            passwordExpired: u.PasswordExpired,
            createdInAd: parseDate(u.WhenCreated),
          },
          update: {
            objectGuid: u.ObjectGuid ?? null,
            name: u.Name ?? null,
            displayName: u.DisplayName,
            mail: u.EmailAddress ?? null,
            upn: u.UserPrincipalName,
            accountEnabled: u.Enabled,
            lockedOut: u.LockedOut,
            jobTitle: u.Title ?? null,
            department: u.Department ?? null,
            description: u.Description ?? null,
            manager: u.Manager ?? null,
            distinguishedName: u.DistinguishedName ?? null,
            building: u.Building ?? null,
            mobilePhone: u.MobilePhone ?? null,
            lastLogonDate: parseDate(u.LastLogonDate),
            passwordLastSet: parseDate(u.PasswordLastSet),
            passwordExpired: u.PasswordExpired,
            createdInAd: parseDate(u.WhenCreated),
          },
        });
        result.usersUpserted++;
      }
    }
  } catch (e) {
    result.errors.push(`Users sync error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 2. Sync Groups ─────────────────────────────────────────────────────────
  try {
    const groupsResult = await executePowerShell(agentId, PS_GET_ALL_GROUPS, 120);
    if (groupsResult.exitCode !== 0) {
      result.errors.push(`Get-ADGroup failed: ${groupsResult.stderr}`);
    } else {
      const psGroups = parseJsonArray<PsAdGroup>(groupsResult.stdout);
      for (const g of psGroups) {
        await prisma.adGroup.upsert({
          where: {
            tenantId_samAccountName: {
              tenantId,
              samAccountName: g.SamAccountName,
            },
          },
          create: {
            tenantId,
            samAccountName: g.SamAccountName,
            displayName: g.Name,
            description: g.Description ?? null,
            groupCategory: g.GroupCategory,
            groupScope: g.GroupScope,
            memberCount: 0,
          },
          update: {
            displayName: g.Name,
            description: g.Description ?? null,
            groupCategory: g.GroupCategory,
            groupScope: g.GroupScope,
          },
        });
        result.groupsUpserted++;
      }
    }
  } catch (e) {
    result.errors.push(`Groups sync error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3. Sync Group Memberships ──────────────────────────────────────────────
  try {
    const groups = await prisma.adGroup.findMany({ where: { tenantId } });
    for (const group of groups) {
      try {
        const membersResult = await executePowerShell(
          agentId,
          psGetGroupMembers(group.samAccountName),
          60
        );
        if (membersResult.exitCode !== 0) continue;

        const psMembers = parseJsonArray<PsGroupMember>(membersResult.stdout);

        // Rebuild memberships — delete stale, insert current
        await prisma.adGroupMember.deleteMany({ where: { tenantId, groupSam: group.samAccountName } });

        for (const m of psMembers) {
          const user = await prisma.adUser.findUnique({
            where: { tenantId_samAccountName: { tenantId, samAccountName: m.SamAccountName } },
          });
          if (!user) continue;
          await prisma.adGroupMember.create({
            data: { tenantId, groupSam: group.samAccountName, userSam: user.samAccountName },
          });
          result.membershipsUpserted++;
        }

        // Update member count
        await prisma.adGroup.update({
          where: { id: group.id },
          data: { memberCount: psMembers.length },
        });
      } catch {
        // Non-fatal: skip this group's memberships
      }
    }
  } catch (e) {
    result.errors.push(`Memberships sync error: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 4. Update tenant last sync timestamp ──────────────────────────────────
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { adLastSyncAt: new Date() },
  });

  return result;
}

// ─── Post-operation single-record sync ───────────────────────────────────────

export async function syncSingleUser(
  tenantId: number,
  agentId: string,
  samAccountName: string
): Promise<void> {
  const result = await executePowerShell(agentId, psSyncUser(samAccountName), 30);
  if (result.exitCode !== 0) {
    throw new Error(`psSyncUser failed: ${result.stderr}`);
  }

  const psUsers = parseJsonArray<PsAdUser>(result.stdout);
  const u = psUsers[0];
  if (!u) throw new Error(`User ${samAccountName} not found in AD after sync`);

  await prisma.adUser.upsert({
    where: { tenantId_samAccountName: { tenantId, samAccountName: u.SamAccountName } },
    create: {
      tenantId,
      samAccountName: u.SamAccountName,
      objectGuid: u.ObjectGuid ?? null,
      name: u.Name ?? null,
      displayName: u.DisplayName,
      mail: u.EmailAddress ?? null,
      upn: u.UserPrincipalName,
      accountEnabled: u.Enabled,
      lockedOut: u.LockedOut,
      jobTitle: u.Title ?? null,
      department: u.Department ?? null,
      description: u.Description ?? null,
      manager: u.Manager ?? null,
      distinguishedName: u.DistinguishedName ?? null,
      building: u.Building ?? null,
      mobilePhone: u.MobilePhone ?? null,
      lastLogonDate: parseDate(u.LastLogonDate),
      passwordLastSet: parseDate(u.PasswordLastSet),
      passwordExpired: u.PasswordExpired,
      createdInAd: parseDate(u.WhenCreated),
    },
    update: {
      objectGuid: u.ObjectGuid ?? null,
      name: u.Name ?? null,
      displayName: u.DisplayName,
      mail: u.EmailAddress ?? null,
      upn: u.UserPrincipalName,
      accountEnabled: u.Enabled,
      lockedOut: u.LockedOut,
      jobTitle: u.Title ?? null,
      department: u.Department ?? null,
      description: u.Description ?? null,
      manager: u.Manager ?? null,
      distinguishedName: u.DistinguishedName ?? null,
      building: u.Building ?? null,
      mobilePhone: u.MobilePhone ?? null,
      lastLogonDate: parseDate(u.LastLogonDate),
      passwordLastSet: parseDate(u.PasswordLastSet),
      passwordExpired: u.PasswordExpired,
      createdInAd: parseDate(u.WhenCreated),
    },
  });
}

export async function syncSingleGroup(
  tenantId: number,
  agentId: string,
  groupSam: string
): Promise<void> {
  const result = await executePowerShell(agentId, psSyncGroup(groupSam), 30);
  if (result.exitCode !== 0) {
    throw new Error(`psSyncGroup failed: ${result.stderr}`);
  }

  const psGroups = parseJsonArray<PsAdGroup>(result.stdout);
  const g = psGroups[0];
  if (!g) throw new Error(`Group ${groupSam} not found in AD after sync`);

  await prisma.adGroup.upsert({
    where: { tenantId_samAccountName: { tenantId, samAccountName: g.SamAccountName } },
    create: {
      tenantId,
      samAccountName: g.SamAccountName,
      displayName: g.Name,
      description: g.Description ?? null,
      groupCategory: g.GroupCategory,
      groupScope: g.GroupScope,
      memberCount: g.MemberCount ?? 0,
    },
    update: {
      displayName: g.Name,
      description: g.Description ?? null,
      groupCategory: g.GroupCategory,
      groupScope: g.GroupScope,
      memberCount: g.MemberCount ?? 0,
    },
  });
}
