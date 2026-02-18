INSERT INTO tbmtasks (task_name, task_details, task_code, ticket_required, rewst_webhook, tenant_exclusive, sync_required, username_required, system_mgr)
VALUES
-- 1
('[SES] Code RED!',
 'Critical alert or incident response trigger in the Sentinel Edge System (SES). Likely initiates high-priority security or access actions.',
 'CODERED', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/01942d16-9b44-702f-827b-67d218a397f9/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 2
('[AD] User Onboarding AD & O365',
 'Creates a new user in Active Directory and assigns the necessary Office 365 licenses and groups.',
 'ENABLEAD', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019601e3-1bdf-7ae8-8309-ef6acf39081e/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 3
('[AD] User Offboarding AD & O365',
 'Disables or removes a user from Active Directory and Office 365, revoking access and licenses. User is converted to shared-mailbox',
 'DISABLEAD', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019601e3-1bdf-7ae8-8309-ef6acf39081e/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 4
('[AD] Reset AD Password',
 'Resets the user''s password in Active Directory.',
 'PASSWORDRESET', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019428fc-a662-71e3-939a-06314e123a28/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, TRUE, TRUE, 'SOLYTICS'),

-- 5
('[AD] Change User UPN',
 'Changes the User Principal Name (UPN) in Active Directory, affecting their login username.',
 'UPNCHANGE', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019601a4-8b13-7254-82f8-0701e87dec6f/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 'HSC', TRUE, TRUE, 'SOLYTICS'),

-- 6
('[MSFT] Get Mailbox Rules',
 'Retrieves mailbox rules set in the user''s Office 365 mailbox.',
 'MAILBOXRULES', FALSE,
 'https://engine.rewst.io/webhooks/custom/trigger/01941b1c-ff0e-7509-8e92-756805871287/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 7
('[MSFT] Get Message Trace',
 'Fetches message delivery and routing logs from Office 365 for a specific user.',
 'MESSAGETRACE', FALSE,
 'https://engine.rewst.io/webhooks/custom/trigger/019196c1-69e1-7252-b790-dade5053423d/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 8
('[MSFT] Reset O365 MFA',
 'Resets the Multi-Factor Authentication settings in Office 365.',
 'RESETMFA', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/01961b80-a6fc-7faf-8186-f537ecef6b5d/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 9
('[MSFT] Remove O365 MFA',
 'Completely removes all MFA methods for a user in Office 365.',
 'REMOVEMFA', TRUE,
 NULL,
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 10
('[MSFT] Unblock User Sign-In',
 'Unblocks or enables a user account that was blocked in Office 365.',
 'UNBLOCK0365', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/01961bdf-5a48-77b7-85e8-15c35ee1582f/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, TRUE, TRUE, 'SOLYTICS'),

-- 11
('[VDI] Reset Horizon Session',
 'Forces a reset or disconnect of the user''s active session in VMware Horizon VDI.',
 'RESETHORIZON', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/01942d7d-93c7-7161-896c-64abf423cf7b/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 'FSHC', FALSE, TRUE, 'SOLYTICS'),

-- 12
('[VDI] Expand App-Volume',
 'Increases the allocated space or resources of a user''s App-Volume in VMware Horizon.',
 'EXPANDHORIZON', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/01942d7d-93c7-7161-896c-64abf423cf7b/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 'FSHC', FALSE, TRUE, 'SOLYTICS'),

-- 13
('[VDI] Delete App-Volume',
 'Deletes the assigned App-Volume for a user in VMware Horizon.',
 'DELETEHORIZON', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/01942d7d-93c7-7161-896c-64abf423cf7b/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 'FSHC', FALSE, TRUE, 'SOLYTICS'),

-- 14
('[AD] Update user''s Mobile-Phone',
 'Modifies the mobile phone attribute in Active Directory for the user.',
 'UPDATEMOBILE', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019635ca-ecd7-7d94-b963-c3a3187ab808/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, TRUE, TRUE, 'SOLYTICS'),

-- 15
('[AD] Update user''s Signature',
 'Changes the email signature stored in Active Directory or O365 profile metadata.',
 'UPDATESIGNATURE', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019635ca-ecd7-7d94-b963-c3a3187ab808/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, TRUE, TRUE, 'SOLYTICS'),

-- 16
('[SES] Sync Tenant Data',
 'Initiates a data synchronization process in Sentinel Edge System (SES) for tenant configurations.',
 'SYNCTENANT', FALSE,
 'https://engine.rewst.io/webhooks/custom/trigger/0196883f-8702-7fa7-ad8a-23ee2563f982/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, FALSE, 'SOLYTICS'),

-- 17
('[AD] Reset Password Timer',
 'Resets the user''s password expiration counter in Active Directory.',
 'RESETPASSEXP', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/01970d8a-bab7-7d96-a1b5-f0cd7adb6f33/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 18
('[AD] Delta Sync',
 'Performs a delta (incremental) sync from on-premises AD to Azure AD.',
 'DELTASYNC', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/01971859-8a1f-78f7-9a46-eeb7eb5477c2/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, FALSE, 'SOLYTICS'),

-- 19
('[MSFT] Increase S&R Mailbox Size',
 'Increase the size limit to 150Mb of all the Incoming and Outgoing emails of the specific mailbox',
 'INCREASESANDR', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019810bd-75c5-78a3-8b0d-69d662b7fa0b/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 20
('[MSFT] Delegate Mailbox Access',
 NULL,
 'DELEGATEACCESS', TRUE,
 NULL,
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 21
('[AD] Reset AD Password (Custom)',
 'Resets the user''s password in Active Directory. Using a personalized password',
 'CUSTOMPASSWORDRESET', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019428fc-a662-71e3-939a-06314e123a28/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 22
('Add Endpoint to PS Allow',
 'Temporally allow Endpoint to run Powershell scripts commands; 4 hours period',
 'ADDTOPS', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019a5a0c-bb8c-785c-a081-a59c65640a26/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 'FSHC', FALSE, FALSE, 'SOPHOS'),

-- 23
('[MSFT] Temporal International Sign',
 'This process will allow a user to sign-in Internationally for a specific amount of days',
 'INTNLSIGN', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019a8063-1936-7923-be2a-5ae0359af2c0/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 NULL, FALSE, TRUE, 'SOLYTICS'),

-- 24
('[SES] DUO 24hr Bypass',
 NULL,
 'DUO_24_BYPASS', TRUE,
 'https://engine.rewst.io/webhooks/custom/trigger/019bfb42-97e3-7b36-98c9-8a3b3795db2d/018fc550-d81f-7944-ab98-7ed82ad39cf0',
 'FSHC', FALSE, TRUE, 'SOLYTICS');
