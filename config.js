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
    
    // Column positions in My Classes
    CLASS_COLUMNS: {
        NAME: 1,        // Column B - Class name
        FULL_NAME: 2,   // Column C - Full class name
        HEX_COLOR: 3    // Column D - Hex color code
    },
    
    // Row where data starts (1-indexed for Sheets API)
    DATA_START_ROW: 3,
    CLASS_START_ROW: 2,
    
    // Values for status
    STATUS_DONE: 'Done',
    STATUS_NOT_DONE: 'Not Done'
};
