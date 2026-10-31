# Data architecture note — Illustrative

> Illustrative document created for the KPMG DMA proof of concept. Not a Himalaya document.

There is no enterprise data lake; each function builds its own extracts.

The material master and vendor master are governed in SAP MDG by a central data team.

The sales control tower is refreshed weekly from uploaded files, so its numbers do not reconcile with SAP.

Fill-rate data comes from an integrated SAP feed into the supply chain dashboard.

HR people analytics is limited: headcount and attrition reports are rebuilt manually in Excel each month.

Procurement spend visibility depends on quarterly SAP extracts compiled in Excel.

Consolidated results come from a single governed BPC data model used by group reporting.

Product specifications are held as a single governed record in Ennovia PLM and synced to SAP.

Store and D2C inventory is visible in one governed view in the retail OMS.
