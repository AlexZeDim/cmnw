# OSINT

Just one thing to clarify all this. Every collection has been connected with each other.  
If a new document has been added to the database, its values will be extrapolated and added to the connected database.
For example: if new character has been added to the OSINT-DB (_characters_ collection), and he joins the new guild, this guild will be added to the _guilds_ collection, then this guild will be indexed, updated and add new characters within its roster.
And so on, this process will never be finished.

- Characters
- Guilds
- Warcraft Logs
- OSINT Logs

## Characters

Characters collection includes over **1M** active characters, most of them are at Russian locale region,
but there aren't any limitation within EU. New characters could come via different ways, like: guild roster, warcraft logs or via Conglomerat-OSINT addon.
Main index character script runs at 06:00 every 2nd day. The index script could run in multiple sessions.

Every character has an object, called `Hashes`, within it stores unique different values based on pets and mounts collection, active pet slots, class, id and title combinations.
With the help of this data, you could always find connections between people and characters / guilds that they own.

Also, characters have also checked for different operations, such as name, faction, race, gender and guild change.

#### Endpoints

- character

## Guilds

OSINT-DB also covers every guild accessible within the region which has any actual PvE progress.
Most of the guild data comes from Kernel's WoWProgress. The main index script covers the whole collection every 6 hours.
Guild logs have been also included in the indexing part. Guild relationship, like all new: joins, leaves, promotes, demotes, ownership change could also apply.

#### Endpoints

- guild

## Warcraft Logs

There is a small collection, called _WarcraftLogs_. It serves one and one purpose only.
Scan for new characters within Kihra's WCL reports. The collection is consist of two fields: **isIndexed:** _Boolean_
and **\_id:** _String_ report's ID. When the report has been indexed but main index script, the document has been removed from the collection via TTL index.

## OSINT Logs

Every sensitive field change for any document within _guilds_ and _characters_ collection has also been watched and added to a special collection, called _OSINT Logs_.
The collected data allows to overseer any notable events within the region, connected with any character or guild.

The only problem is character's transfer with rename. It could not been tracked via normal way because of Blizzard `player-GUID`
system. So we find a sophisticated way, called `shadowCopy` algorithm, for example:

- renamedCopy — when character has been renamed, but still stays on the same realm as before. Requires `id`, `class` and `realm` check.
- transferCopy — if character has been transferred, but don't change his original name. Requires check within all realms by the old name, class and `Hash A`.
- shadowCopy — when character changes both, realm and name. It requires a certain check by its `Hash A` , class and level value.

Not 100% sure but, even `transfwer` event could be noticed with certain level of confidence.

#### Endpoints

- character_logs
- guild_logs
