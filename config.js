// Configuration for your Google Sheet
const CONFIG = {
    // Your Google Sheet ID (from the URL)
    SHEET_ID: '1vgft-lJ15yTzBsl9klSCH71KmFnRHjW8Y_x7gMfjCWs',
    
    // Sheet tab names
    MASTERLIST_TAB: 'Masterlist',
    CLASSES_TAB: 'My Classes',
    
    // Column positions in Masterlist (A=0, B=1, etc.)
    COLUMNS: {
        STATUS: 0,      // Column A - Done/Not Done
        DAY: 1,         // Column B - Day of week (auto-calculated)
        DUE_DATE: 2,    // Column C - Due date
        CLASS: 3,       // Column D - Class name
        ASSIGNMENT: 4,  // Column E - Assignment name
        DAYS_UNTIL: 5   // Column F - Days until due (auto-calculated)
    },
    
    // Column positions in My Classes (adjusted based on your screenshot)
    // Fetching B:D, so B=index 0, C=index 1, D=index 2
    CLASS_COLUMNS: {
        NAME: 0,        // Column B - Class name (index 0 when fetching B:D)
        FULL_NAME: 1,   // Column C - Full class name (index 1)
        HEX_COLOR: 2    // Column D - Hex color code (index 2)
    },
    
    // Row where data starts (1-indexed for Sheets API)
    DATA_START_ROW: 3,
    CLASS_START_ROW: 2,
    
    // Values for status
    STATUS_DONE: 'Done',
    STATUS_NOT_DONE: 'Not Done'
};
