/**
 * PowerShell scripts for Active Directory operations.
 *
 * Design decisions:
 * - @(...) wraps all Get-AD* calls to force array output even for single results
 * - DateTime fields use .ToString('o') for ISO 8601 format (parseable by JS Date)
 * - ObjectGUID uses .ToString() to get the string representation
 * - ConvertTo-Json -Compress reduces payload size for large tenants
 * - Line breaks use natural PowerShell continuations (after , | {) — no backtick
 *   continuations, which would conflict with TypeScript template literal syntax
 */

// ─── Read / Sync scripts ──────────────────────────────────────────────────────

/** Full sync: all users with relevant AD properties */
export const PS_GET_ALL_USERS = [
  "$props = 'SamAccountName','ObjectGUID','Name','DisplayName','EmailAddress','UserPrincipalName','Enabled','Title','Department','Description','Manager','DistinguishedName','physicalDeliveryOfficeName','MobilePhone','LastLogonDate','PasswordLastSet','PasswordExpired','PasswordNeverExpires','LockedOut','WhenCreated'",
  "$users = @(Get-ADUser -Filter * -Properties $props)",
  "$result = $users | Select-Object SamAccountName,Name,",
  "  @{N='ObjectGuid';E={$_.ObjectGUID.ToString()}},",
  "  DisplayName,EmailAddress,UserPrincipalName,Enabled,LockedOut,Title,Department,",
  "  Description,DistinguishedName,MobilePhone,",
  "  @{N='Building';E={$_.physicalDeliveryOfficeName}},",
  "  @{N='Manager';E={if($_.Manager){($_.Manager -split ',')[0] -replace '^CN=',''}else{$null}}},",
  "  @{N='LastLogonDate';E={if($_.LastLogonDate){$_.LastLogonDate.ToString('o')}else{$null}}},",
  "  @{N='PasswordLastSet';E={if($_.PasswordLastSet){$_.PasswordLastSet.ToString('o')}else{$null}}},",
  "  PasswordExpired,PasswordNeverExpires,",
  "  @{N='WhenCreated';E={if($_.WhenCreated){$_.WhenCreated.ToString('o')}else{$null}}}",
  "ConvertTo-Json -InputObject $result -Compress -Depth 2",
].join("\n");

/** Full sync: all groups */
export const PS_GET_ALL_GROUPS = [
  "$groups = @(Get-ADGroup -Filter * -Properties SamAccountName,Name,Description,GroupCategory,GroupScope)",
  "$result = $groups | Select-Object SamAccountName,Name,Description,",
  "  @{N='GroupCategory';E={$_.GroupCategory.ToString()}},",
  "  @{N='GroupScope';E={$_.GroupScope.ToString()}}",
  "ConvertTo-Json -InputObject $result -Compress -Depth 2",
].join("\n");

/** Get members of a specific group (by SamAccountName) */
export function psGetGroupMembers(groupSam: string): string {
  const safe = escapePsParam(groupSam);
  return [
    `$members = @(Get-ADGroupMember -Identity '${safe}' -Recursive:$false | Where-Object {$_.objectClass -eq 'user'})`,
    "$result = $members | Select-Object SamAccountName,Name",
    "ConvertTo-Json -InputObject $result -Compress -Depth 2",
  ].join("\n");
}

/** Sync a single user after a write operation */
export function psSyncUser(samAccountName: string): string {
  const safe = escapePsParam(samAccountName);
  return [
    `$props = 'SamAccountName','ObjectGUID','Name','DisplayName','EmailAddress','UserPrincipalName','Enabled','Title','Department','Description','Manager','DistinguishedName','physicalDeliveryOfficeName','MobilePhone','LastLogonDate','PasswordLastSet','PasswordExpired','PasswordNeverExpires','LockedOut','WhenCreated'`,
    `$u = Get-ADUser -Identity '${safe}' -Properties $props`,
    "$result = $u | Select-Object SamAccountName,Name,",
    "  @{N='ObjectGuid';E={$_.ObjectGUID.ToString()}},",
    "  DisplayName,EmailAddress,UserPrincipalName,Enabled,LockedOut,Title,Department,",
    "  Description,DistinguishedName,MobilePhone,",
    "  @{N='Building';E={$_.physicalDeliveryOfficeName}},",
    "  @{N='Manager';E={if($_.Manager){($_.Manager -split ',')[0] -replace '^CN=',''}else{$null}}},",
    "  @{N='LastLogonDate';E={if($_.LastLogonDate){$_.LastLogonDate.ToString('o')}else{$null}}},",
    "  @{N='PasswordLastSet';E={if($_.PasswordLastSet){$_.PasswordLastSet.ToString('o')}else{$null}}},",
    "  PasswordExpired,PasswordNeverExpires,",
    "  @{N='WhenCreated';E={if($_.WhenCreated){$_.WhenCreated.ToString('o')}else{$null}}}",
    "ConvertTo-Json -InputObject $result -Compress -Depth 2",
  ].join("\n");
}

/** Sync a single group after a write operation */
export function psSyncGroup(groupSam: string): string {
  const safe = escapePsParam(groupSam);
  return [
    `$g = Get-ADGroup -Identity '${safe}' -Properties SamAccountName,Name,Description,GroupCategory,GroupScope`,
    `$memberCount = @(Get-ADGroupMember -Identity '${safe}').Count`,
    "$result = $g | Select-Object SamAccountName,Name,Description,",
    "  @{N='GroupCategory';E={$_.GroupCategory.ToString()}},",
    "  @{N='GroupScope';E={$_.GroupScope.ToString()}},",
    "  @{N='MemberCount';E={$memberCount}}",
    "ConvertTo-Json -InputObject $result -Compress -Depth 2",
  ].join("\n");
}

// ─── Write scripts ────────────────────────────────────────────────────────────

export function psDisableUser(samAccountName: string): string {
  const safe = escapePsParam(samAccountName);
  return `Disable-ADAccount -Identity '${safe}'; Write-Output 'OK'`;
}

export function psEnableUser(samAccountName: string): string {
  const safe = escapePsParam(samAccountName);
  return `Enable-ADAccount -Identity '${safe}'; Write-Output 'OK'`;
}

export function psUnlockUser(samAccountName: string): string {
  const safe = escapePsParam(samAccountName);
  return `Unlock-ADAccount -Identity '${safe}'; Write-Output 'OK'`;
}

export function psResetPassword(samAccountName: string, newPassword: string): string {
  const safeSam = escapePsParam(samAccountName);
  const safePwd = escapePsParam(newPassword);
  return [
    `$secPwd = ConvertTo-SecureString '${safePwd}' -AsPlainText -Force`,
    `Set-ADAccountPassword -Identity '${safeSam}' -Reset -NewPassword $secPwd`,
    `Set-ADUser -Identity '${safeSam}' -ChangePasswordAtLogon $true`,
    "Write-Output 'OK'",
  ].join("; ");
}

export function psAddGroupMember(groupSam: string, userSam: string): string {
  const safeGroup = escapePsParam(groupSam);
  const safeUser = escapePsParam(userSam);
  return `Add-ADGroupMember -Identity '${safeGroup}' -Members '${safeUser}'; Write-Output 'OK'`;
}

export function psRemoveGroupMember(groupSam: string, userSam: string): string {
  const safeGroup = escapePsParam(groupSam);
  const safeUser = escapePsParam(userSam);
  return `Remove-ADGroupMember -Identity '${safeGroup}' -Members '${safeUser}' -Confirm:$false; Write-Output 'OK'`;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Escapes a value for use inside single-quoted PowerShell strings.
 * Single quotes in PS strings are escaped by doubling them: ' → ''
 */
function escapePsParam(value: string): string {
  return value.replace(/'/g, "''");
}
