var PROXY_SHARED_SECRET_ = "108785acf8172ca1acb1324af722507926b14160ab56f03c18bc6e3d6d811127";

// --------------------------------------------------------------------------
// Section A: APPLICATION LIFECYCLE (public / applicant-facing)
// --------------------------------------------------------------------------
var ALLOWED_FUNCTIONS_ = [

  "portalGetBootstrap",                  // Public site bootstrap (settings, active user, announcements)
  "processPortalLogin",                  // Admin/member login (returns session token)
  "portalLogoutSession",                 // Revoke a session token

  // Membership applications
  "portalSubmitApplication",             // Apply with an invite token
  "portalCheckStatus",                   // Applicant checks own application status
  "portalVerifyRecord",                  // Public record/QR verification

  // --------------------------------------------------------------------------
  // Section B: ADMIN OPERATIONS (Admin or Superadmin session required)
  // --------------------------------------------------------------------------

  // Dashboard & reporting
  "portalAdminSummary",                  // Aggregate counts
  "portalDashboardSummary",              // Full dashboard (includes recent activity)
  "portalDashboardWidgets",              // Widget counts across all collections
  "portalReportsSummary",                // Analytics reports
  "portalSearchRecords",                 // Search members/applications/tasks

  // Member / application roster
  "portalAdminListApplications",         // Full application list (optional status filter)
  "portalAdminListMembers",              // Member roster view
  "portalAdminApproveApplication",       // Approve an applicant row
  "portalAdminRejectApplication",        // Reject an applicant row

  // Invite tokens
  "portalAdminListTokens",               // Token registry
  "portalAdminGenerateToken",            // Issue new invite token
  "portalAdminSetTokenStatus",           // Activate / revoke a token

  // Announcements
  "portalAdminPublishAnnouncement",      // Publish an announcement
  "portalListPublicAnnouncements",       // Published public announcements (also public)
  "portalListActivities",                // Published activities (public)
  "portalAdminSaveActivity",             // Post an activity
  "portalListResources",                 // Published resources (public)
  "portalAdminSaveResource",             // Upload/save a resource

  // Documents & QR
  "portalAdminGenerateMemberDocument",   // Generate verification/ID/summary letter
  "portalGenerateMemberQr",              // Generate member QR verification link

  // Notifications
  "portalSendPortalNotice",              // Send an in-portal notice (+ optional email)

  // Payments
  "portalAdminListPayments",             // Full payment records
  "portalAdminSavePayment",              // Create/update a payment record

  // --------------------------------------------------------------------------
  // Section C: SUPERADMIN OPERATIONS (Superadmin role required)
  // --------------------------------------------------------------------------

  // Task management
  "portalSuperadminAssignTask",          // Assign a task (+ email notification)
  "portalSuperadminListTasks",           // All tasks
  "portalSuperadminRevokeTask",          // Revoke a task (+ email notification)
  "portalTaskUpdateStatus",              // Any signed-in user updates OWN task status

  // User & role management
  "portalSuperadminSaveUser",            // Create/update a managed user account
  "portalSuperadminListUsers",           // User registry
  "portalSuperadminRevokeUserRole",      // Demote a user to Student
  "portalSuperadminSavePermission",      // Grant a granular permission
  "portalGetPortalSettings",             // View full Settings sheet
  "portalSavePortalSetting",             // Edit any setting
  "portalGetPublicSettings",             // Read-only public settings (portal name, deadline, fee, etc.)
  "portalSavePublicSettings",            // Admin edit of public-facing settings

  // --------------------------------------------------------------------------
  // Section D: MEMBER / SIGNED-IN USER OPERATIONS
  // --------------------------------------------------------------------------

  // Profile
  "portalGetMyProfile",                  // Member profile card
  "portalUpdateMyProfile",               // Update phone / department / photo
  "portalChangeMyPassword",              // Self-service password change
  "portalResetUserPassword",             // Admin-initiated password reset

  // Personal content
  "portalMyTasks",                       // Tasks assigned to me
  "portalMyPayments",                    // My payments + student-audience items
  "portalFetchMyNotifications",          // My notifications
  "portalSubmitComplaint",               // Submit a support ticket
  "portalProcessPaymentTransaction",     // Submit a payment for review
  "portalUploadFile",                    // Upload a document/image to Drive
  "portalDownloadPrivateFile",           // Download a private uploaded file
  "portalTrackEvent",                    // Log analytics event

  // --------------------------------------------------------------------------
  // Section E: PHASE 2 GENERIC COLLECTION API
  // Access is enforced per-collection by config (public/member/admin/
  // ownerOrAdmin), not by the allowlist. Keep all of these allowlisted.
  // --------------------------------------------------------------------------

  "portalCollectionList",
  "portalCollectionCreate",
  "portalCollectionUpdate",
  "portalCollectionDelete",
  "portalCollectionRecordDownload",

  // --------------------------------------------------------------------------
  // Section F: SUBSYSTEM ENDPOINTS (Alumni, Research, Events, Career, ...)
  // --------------------------------------------------------------------------

  "portalFetchAlumniRegistryData",
  "portalSaveAlumniRegistryData",
  "portalFetchResearchRepository",
  "portalSubmitResearchManuscript",
  "portalSubmitManuscript",
  "portalModerateResearchManuscript",
  "portalFetchEventRegistry",
  "portalRegisterForEvent",
  "portalFetchCareerDevelopmentData",
  "portalFetchMentorshipConnections",
  "portalFetchCommitteeManagementRegistry",
  "portalFetchProjectManagementRegistry",
  "portalFetchAssetInventoryRegistry",
  "portalFetchInstitutionalArchiveHistory",

  // --------------------------------------------------------------------------
  // Section G: APPLICATION RESOLUTION (Command Center)
  // --------------------------------------------------------------------------

  "fetchPendingApplicationsFromServer",
  "handleApplicationResolution",

  // --------------------------------------------------------------------------
  // Section H: FINE-GRAINED PERMISSION CHECK (currently unused by any
  // endpoint, but safe to expose; it only returns true/false for a role or
  // email against the Role Permissions sheet)
  // --------------------------------------------------------------------------

  "checkPermission"
];

// --------------------------------------------------------------------------
// POST handler - receives requests from Vercel proxy
// --------------------------------------------------------------------------

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var fn = data.fn;
    var args = data.args || [];
    var secret = data.secret;

    // Verify shared secret
    if (secret !== PROXY_SHARED_SECRET_) {
      return ContentService.createTextOutput(JSON.stringify({
        error: "Unauthorized: Invalid secret"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Check if function is allowed
    if (ALLOWED_FUNCTIONS_.indexOf(fn) === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        error: "Unauthorized: Function not allowed"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Check if function exists
    if (typeof this[fn] !== "function") {
      return ContentService.createTextOutput(JSON.stringify({
        error: "Function not found: " + fn
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Call the function with arguments
    var result = this[fn].apply(this, args);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// --------------------------------------------------------------------------
// GET handler - returns a simple message (the real UI is served by Vercel)
// --------------------------------------------------------------------------

function doGet(e) {
  return ContentService.createTextOutput(
    "BIOSSA-UL API Router. Access the portal via the Vercel frontend."
  ).setMimeType(ContentService.MimeType.TEXT);
}
