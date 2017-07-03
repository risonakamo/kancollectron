//viewer object handles html display ect related things

element tabs;
element-array pages;
element tabBar;
int currentTab;

/*--- one times ---*/
void ipcReceivers(); //main process listeners
void setupInput(); //setup input page
void setupTabs(); //setup tab system
void keyControl(); //setup key control system for viewer page only (not input)

/*--- utility ---*/
void EQswitch(char key); //performs tab switching given e or q key
void tabPage(int page); //navigate to specified page