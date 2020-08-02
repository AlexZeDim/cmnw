# OSINT

Just one thing to clarify all this. Every collection has been connected with each other.  
If a new character or guild has been added to the database, its data will be extrapolated and added to the connected database.
For example: if new character has been added to the OSINT-DB (*characters* collection), and he joins the new guild, this guild will be added to the *guilds* collection, then this guild will be indexed, updated and add new characters within its roster.
And so on, this process will never be finished.

 - Characters
 - Guilds
 - Warcraft Logs
 - OSINT Logs

## Characters

Characters collection includes over **1M** active characters, most of them are at Russian locale region,
but there aren't any limitation within EU. New characters could come via different ways, like: guild roster, warcraft logs or via Conglomerat-OSINT addon.
Main index character script runs at 06:00 every 2nd day. The index script could run in multiple sessions.

Every character has also checked for different operations, such as name, faction, race, gender and guild change.

 #### Endpoints
 
  - character
  
 ## Guilds
 
 OSINT-DB also covers every guild accessible within the region which has any actual PvE progress.
 Most of the guild data comes from Kernel's WoWProgress. The main index script covers the whole collection every 6 hours.
 Guild logs have been also included in the indexing part. Guild relationship, like all new: joins, leaves, promotes, demotes, ownership change could also apply.
 
  #### Endpoints
  
   - guild
  
  
 

