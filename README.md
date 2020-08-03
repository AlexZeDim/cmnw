# Conglomerat Group

Welcome aboard! Conglomerat has a module-based structure, that in case of matters could be easily re-build and separated as a micro-services.  

Modules:

 - [CORE][1]
 - [OSINT][2]
 - [DMA][3]
 - [DISCORD][4]
 - [VOLUSPA][5]
 - [HYBRID][6]
 
 ## CORE
 
 A central orchestration module. A spine on which Conglomerat is build. 
 Includes .env & yaml files, http server, back-end API endpoint and a Battle.net token refresher.
  
  DB: 
   - setters
   - keys_db
   
 ## OSINT
 
 An Open Source INTellegence database is responsible for cataloging, indexing and storing data about characters, guilds and their states. 
 This module also has a capability to watch over every race / name / gender / faction change, and even realm transfers.
 Among its data sources are: 
 
  - [WoWProgress](https://wowprogress.com)
  - [WarcraftLogs](https://warcraftlogs.com)
  - [Battle.net Guild Roster](https://battle.net)
 
  DB: 
  - characters_db
  - guilds_db
  - osint_logs_db
  - realms_db
  - logs_db
  
  ## DMA
  
  Direct Market Access module receives up-to-date information about auction house situation on various realms or within the entire region. 
  Historical information included as a part of DMA / contracts.
  It also stores item data and provide their valuation, based on their asset class. The synergy effect allows to combine all this data
  for private cased solution of commercial voyager problem / cross realm operations.
  
  DB: 
  - auctions_db
  - items_db
  - golds_db
  - contracts_db
  - realms_db
  
  ## DISCORD 
  
  Bluratella's Discord bot is relying on Conglomerat API and its data to provide requested information to a user.
  The bot could also transfer anonymous and secured messages between every users within his discord server reach.
  You could read more about it [here](https://ya.ru).
  
  ## VOLUSPA
  
  **[REDACTED]** Guild / Persona Identities system, which will be build on OSINT foundation.
  Predictive. Recommendations. Analytics. Information flow control.
  
  ## HYBRID
  
  **[REDACTED]** A Hybrid project which should be build with using of [Tensorflow.js](https://ya.ru)
  
  [1]: #CORE
  [2]: #OSINT
  [3]: #DMA
  [4]: #DISCORD
  [5]: #VOLUSPA
  [6]: #HYBRID
  
  
  