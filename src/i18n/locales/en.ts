/**
 * FRC Scout Scanner - English Translations
 */

import type { Translations } from './zh-TW';

export const en: Translations = {
  // Navigation
  nav: {
    scan: 'Scan',
    history: 'History',
    path: 'Path',
    settings: 'Settings',
  },

  // Scan Page
  scan: {
    title: 'QR Scanner',
    scanning: 'Scanning...',
    continue: 'Continue Scanning',
    save: 'Save',
    discard: 'Discard',
    initCamera: 'Initializing camera...',
    cameraError: 'Unable to access camera. Please grant permission.',
    decodeFailed: 'Decode failed',
    cameraNotFound: 'Camera not found. Please make sure your device has an available camera.',
    cameraPermissionDenied: 'Camera permission denied. Please allow camera access in your browser settings.',
    cameraInitFailed: 'Failed to initialize camera. Please refresh the page and try again.',
    retry: 'Retry',
  },

  // Result
  result: {
    validationPassed: 'Validation passed',
    errors: 'error(s)',
    warnings: 'warning(s)',
    saved: 'Data saved successfully',
    pathMerged: 'Path data merged with match',
    pitPathMerged: 'Path data merged with pit',
    incomplete: 'Data is incomplete, cannot save',
    alreadyExists: 'already exists',
  },

  // History Page
  history: {
    title: 'Scan History',
    filter: 'Filter',
    all: 'All',
    allTypes: 'All Types',
    allStatus: 'All Status',
    type: 'Type',
    status: 'Status',
    uploaded: 'Uploaded',
    pending: 'Pending',
    selectAll: 'Select All',
    selected: 'selected',
    uploadSelected: 'Upload Selected',
    deleteSelected: 'Delete Selected',
    exportCSV: 'Export CSV',
    exportJSON: 'Export JSON',
    clearAll: 'Clear All',
    noRecords: 'No scan history',
    startScanning: 'Start scanning QR codes to see them here',
    moreItems: 'more items',
    total: 'Total',
    details: 'Scan Details',
    team: 'Team',
    match: 'Match',
    event: 'Event',
    scanTime: 'Scan Time',
  },

  // Settings Page
  settings: {
    title: 'Settings',
    sheetsApi: 'Google Sheets',
    sheetsUrl: 'Apps Script URL',
    sheetsUrlHint: 'Deploy your Google Apps Script as web app and paste the URL here',
    testConnection: 'Test Connection',
    connected: 'Connected',
    failed: 'Failed',
    notConnected: 'Not Connected',
    exportSettings: 'Export Settings',
    defaultFormat: 'Default Export Format',
    includeHeaders: 'Include Headers',
    includeHeadersDesc: 'Include column headers in CSV export',
    timeFormat: 'Time Format',
    localFormat: 'Local Format',
    scanSettings: 'Scan Settings',
    autoUpload: 'Auto Upload',
    autoUploadDesc: 'Automatically upload after scanning',
    playSound: 'Sound Effect',
    playSoundDesc: 'Play sound on successful scan',
    vibrate: 'Vibration',
    vibrateDesc: 'Vibrate on successful scan',
    dataManagement: 'Data Management',
    scanHistory: 'Scan History',
    recordsStored: 'records stored locally',
    historyCleared: 'History cleared',
    about: 'About',
    version: 'Version',
    builtFor: 'Built for FRC Team 6998',
    description: 'Scan QR codes from Scouting PASS and upload to Google Sheets',
    clearConfirmTitle: 'Clear History',
    clearConfirmMessage: 'Are you sure you want to delete all {count} scan records? This action cannot be undone.',
    language: 'Language',
  },

  // Path Query
  pathQuery: {
    title: 'Query from Backend',
    queryByMatch: 'By Match',
    queryByTeam: 'By Team',
    eventCode: 'Event Code',
    matchLevel: 'Match Level',
    matchNumber: 'Match Number',
    teamNumber: 'Team Number',
    query: 'Query',
    querying: 'Querying...',
    resultCount: 'Found {count} path(s)',
    noResults: 'No path data found',
    noApiUrl: 'Please configure Google Sheets API URL in Settings first',
    practice: 'Practice',
    quals: 'Quals',
    playoff: 'Playoff',
    other: 'Other',
    manualAdd: 'Add Path Manually',
  },

  // Path Viewer
  pathViewer: {
    pathList: 'Path List',
    clearAll: 'Clear All',
    export: 'Export',
    showAll: 'All',
    redOnly: 'Red',
    blueOnly: 'Blue',
    distance: 'dist',
    saved: 'Saved',
    hideAll: 'Hide All',
    showAllPaths: 'Show All',
    typeAll: 'All',
    typePit: 'Pit',
    typeTest: 'Test',
    typeQuals: 'Quals',
    typePlayoff: 'Playoff',
  },

  // QR Types
  qrType: {
    match: 'Match Data',
    path: 'Path Data',
    pitPath: 'Pit Path Data',
    pit: 'Pit Data',
    unknown: 'Unknown',
  },

  // Upload
  upload: {
    pendingUpload: 'Pending Upload',
    uploadAll: 'Upload All',
    noItems: 'No items to upload',
    complete: 'Upload complete',
    success: 'success',
    failed: 'failed',
    uploadFailed: 'Upload failed',
    connectionFailed: 'Connection test failed',
    successCount: 'Successfully uploaded {count} items',
  },

  // Export
  export: {
    noData: 'No data to export',
    jsonSuccess: 'JSON exported successfully',
    csvCount: 'Exported {count} CSV file(s)',
  },

  // Field Labels (v1.7.0)
  fields: {
    // PreMatch
    scouterName: 'Scouter',
    eventCode: 'Event Code',
    matchLevel: 'Match Level',
    matchNumber: 'Match #',
    alliance: 'Alliance',
    teamNumber: 'Team #',
    // Auto
    autoClimbStatus: 'Auto Climb',
    autoClimbTime: 'Auto Climb Time',
    autoClimbPosition: 'Auto Climb Position',
    // Teleop
    bumpCount: 'Bump Crossings',
    trenchCount: 'Trench Crossings',
    fuelDroppedOnBumpCount: 'Fuel Dropped on Bump',
    minorPenalty: 'Minor Penalties',
    majorPenalty: 'Major Penalties',
    teleClimbStatus: 'Tele Climb',
    teleClimbTime: 'Tele Climb Time',
    teleClimbPosition: 'Tele Climb Position',
    // PostMatch Issues
    issueNoShow: 'No Show',
    issueCrashed: 'Robot Died/Disabled',
    issueEStop: 'E-Stop',
    issueAStop: 'A-Stop',
    issueLowVoltage: 'Low Voltage',
    issueIntakeStuck: 'Intake Stuck',
    issueShooterOff: 'Shooter Off',
    issueShooterStutter: 'Shooter stutters',
    issueStuckBump: 'Stuck on Bump',
    issueHitTrench: 'Hit Trench',
    issuePartFell: 'Part Fell Off',
    issueMovement: 'Movement Issue',
    // PostMatch Flags
    flagYellowCard: 'Yellow Card',
    flagRedCard: 'Red Card',
    flagBelowExpected: 'Below Expected',
    flagTipped: 'Tipped',
    flagRidingFuel: 'Riding on Fuel',
    flagStuckBall: 'Stuck Ball',
    // PostMatch Collision
    hasCollision: 'Had Collision',
    collisionField: 'Hit Field',
    collisionRobot: 'Hit Robot',
    collisionTeamNumbers: 'Collided Teams',
    // PostMatch Ratings
    ratingPushTrench: 'Push to Alliance (trench)',
    ratingPushBump: 'Push to Alliance (bump)',
    ratingShoot: 'Shoot to Alliance',
    ratingHuman: 'Feed Human Player',
    ratingDefense: 'Defense',
    ratingIntakeFuel: 'Intake Fuel',
    ratingTransportFuel: 'Transport Fuel',
    ratingShootFuel: 'Shoot Fuel',
    // Free-text
    comments: 'Comments',
    // Path
    autoPath: 'Auto Path',
    // Pit
    pitDriveTrain: 'Drivetrain',
    pitMotorType: 'Motor Type',
    pitLength: 'Length',
    pitWidth: 'Width',
    pitWeight: 'Weight',
    pitCanFuel: 'Can Fuel',
    pitCanTowerL1: 'Can L1',
    pitCanTowerL2: 'Can L2',
    pitCanTowerL3: 'Can L3',
    pitAutoNotes: 'Auto Notes',
    // UI
    noPath: 'No path',
    points: 'points',
  },

  // Common
  common: {
    yes: 'Yes',
    no: 'No',
    confirm: 'Confirm',
    cancel: 'Cancel',
    upload: 'Upload',
    delete: 'Delete',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    deleted: 'Deleted {count} item(s)',
  },
};
